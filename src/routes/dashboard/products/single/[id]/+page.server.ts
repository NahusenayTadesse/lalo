import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { edit, adjust, damaged, editGallery, editPrice, addPrice, deletePrice } from './schema';

import { translation } from '$lib/server/localize';
import { db } from '$lib/server/db';
import {
	products,
	productImages,
	damagedProducts,
	prices as priceList,
	transactions
} from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { StockError, receiveStock, removeStock, syncProductTotal } from '$lib/server/inventory';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';

import { deleteUploadedFile, saveUploadedFile } from '$lib/server/upload';
import type { Actions } from './$types';

export const actions: Actions = {
	editProduct: async ({ request, cookies, locals, params }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return fail(400, { form });
		}

		const {
			productName,
			productNameAm,
			category,
			description,
			descriptionAm,
			supplier,
			reorderLevel,
			image
		} = form.data;

		try {
			await db
				.update(products)
				.set({
					name: productName,
					nameAm: translation(productNameAm),
					description,
					descriptionAm: translation(descriptionAm),
					categoryId: category,
					// An empty supplier used to be stored as supplier #1.
					supplierId: supplier || null,
					reorderLevel,
					updatedBy: locals?.user?.id,
					// No new upload means "keep the current image".
					...(image instanceof File && image.size > 0
						? { featuredImage: await saveUploadedFile(image) }
						: {})
				})
				.where(eq(products.id, Number(id)));

			return message(form, { type: 'success', text: 'Product Updated Successfully' });
		} catch (err) {
			console.error('Product update failed:', err);
			return message(form, { type: 'error', text: 'Product Update Failed' }, { status: 500 });
		}
	},
	adjust: async ({ request, params, locals }) => {
		const form = await superValidate(request, zod4(adjust));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		const {
			intent,
			variantId,
			quantity,
			reason,
			employeeResponsible,
			costPerItem,
			reciept,
			supplier,
			batchNumber,
			manufacturedAt,
			expiresAt,
			batchId
		} = form.data;

		if (!(await variantBelongsTo(variantId, Number(params.id)))) {
			return message(
				form,
				{ type: 'error', text: 'That variant is not on this product' },
				{ status: 400 }
			);
		}

		const fullReason = [reason, `Employee: ${employeeResponsible}`].filter(Boolean).join(' — ');
		// Written before the transaction so a slow upload doesn't hold a connection open.
		const recieptLink =
			intent === 'add' && reciept instanceof File && reciept.size > 0
				? await saveUploadedFile(reciept)
				: undefined;

		try {
			const text = await db.transaction(async (tx) => {
				if (intent === 'remove') {
					await removeStock(
						tx,
						{
							variantId,
							quantity,
							batchId: batchId || null,
							type: 'correction',
							reason: fullReason
						},
						locals.user?.id
					);
					return `Removed ${quantity} from stock`;
				}

				let transactionId: number | undefined;
				if (recieptLink) {
					const [tranId] = await tx
						.insert(transactions)
						.values({
							// What the stock cost.
							amount: ((costPerItem ?? 0) * quantity).toFixed(2),
							recieptLink,
							createdBy: locals.user?.id
						})
						.$returningId();
					transactionId = tranId.id;
				}

				const batch = await receiveStock(
					tx,
					{
						variantId,
						quantity,
						batchNumber,
						manufacturedAt,
						expiresAt,
						costPerUnit: costPerItem ?? null,
						supplierId: supplier || null,
						transactionId,
						reason: fullReason || undefined
					},
					locals.user?.id
				);
				return `Received ${quantity} as batch ${batch.batchNumber}`;
			});

			return message(form, { type: 'success', text });
		} catch (err) {
			if (recieptLink) await deleteUploadedFile(recieptLink);
			if (!(err instanceof StockError)) console.error('Stock adjustment failed:', err);
			return message(
				form,
				{
					type: 'error',
					text: err instanceof StockError ? err.message : 'Could not change the stock'
				},
				{ status: 400 }
			);
		}
	},
	delete: async ({ cookies, params }) => {
		const { id } = params;

		try {
			if (!id) {
				setFlash({ type: 'error', message: 'Product ID not provided' }, cookies);
				return fail(400);
			}

			await db.delete(products).where(eq(products.id, Number(id)));

			setFlash({ type: 'success', message: 'Product Deleted Successfully!' }, cookies);
		} catch (err) {
			console.error('Error deleting product:', err);
			setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
			return fail(400);
		}
	},
	damaged: async ({ params, locals, request }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(damaged));

		if (!id) {
			return message(form, { type: 'error', text: 'Product ID not provided' }, { status: 400 });
		}

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		const { variantId, batchId, quantity, damagedBy, reason } = form.data;
		const productId = Number(id);

		if (!(await variantBelongsTo(variantId, productId))) {
			return message(
				form,
				{ type: 'error', text: 'That variant is not on this product' },
				{ status: 400 }
			);
		}

		try {
			await db.transaction(async (tx) => {
				const draws = await removeStock(
					tx,
					{
						variantId,
						quantity,
						batchId: batchId || null,
						type: 'damage',
						reason: ['Damaged', reason, `By: ${damagedBy}`].filter(Boolean).join(' — ')
					},
					locals.user?.id
				);

				// One record per batch the units came out of.
				await tx.insert(damagedProducts).values(
					draws.map((d) => ({
						productId,
						variantId,
						batchId: d.batchId,
						quantity: d.quantity,
						createdBy: locals.user?.id,
						damagedBy,
						// NOT NULL column, optional field: no reason used to fail the insert.
						reason: reason ?? ''
					}))
				);
			});

			return message(form, { type: 'success', text: 'Damaged supply added Successfully!' });
		} catch (err) {
			if (!(err instanceof StockError)) console.error('Error marking adding damaged supply:', err);
			return message(
				form,
				{
					type: 'error',
					text: err instanceof StockError ? err.message : 'Could not record the damage'
				},
				{ status: 400 }
			);
		}
	},
	editGallery: async ({ params, locals, request }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(editGallery));

		// Without this, a bad submission reached `existing.split(',')` below and threw.
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		const { existing, gallery } = form.data;

		try {
			if (!id) {
				return message(form, { type: 'error', text: 'Unexpected Error: Product ID not provided' });
			}

			await db.transaction(async (tx) => {
				let galleryImages = [];

				// 1. Upload new files if they exist
				if (gallery && gallery.length > 0) {
					galleryImages = await uploadGallery(gallery);
				}
				const old = existing.split(',');
				// 2. Combine existing (edited) strings with newly uploaded URLs
				// We filter out empty strings/nulls to ensure data integrity
				const finalList = [...new Set([...old, ...galleryImages])].filter(
					(item) => item && item.trim() !== ''
				);

				// 3. ALWAYS sync if the final list is valid,
				// even if galleryImages.length is 0 (e.g., you just deleted an old photo)
				if (finalList.length > 0) {
					const imageRecords = finalList.map((url) => ({
						productId: Number(id),
						imageUrl: url
					}));

					// Wipe the old associations and replace with the new "finalList"
					await tx.delete(productImages).where(eq(productImages.productId, Number(id)));
					await tx.insert(productImages).values(imageRecords);
				} else {
					// Handle the case where all images were removed
					await tx.delete(productImages).where(eq(productImages.productId, Number(id)));
				}
			});

			return message(form, { type: 'success', text: 'Product Gallery added Successfully!' });
		} catch (err) {
			console.error('Error marking adding product gallery:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	},
	editPrice: async ({ request, params }) => {
		const form = await superValidate(request, zod4(editPrice));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { id, price, amount, sku, reorderLevel } = form.data;

		if (sku && (await skuTaken(sku, id))) {
			return message(form, { type: 'error', text: `SKU ${sku} is already used` }, { status: 400 });
		}

		try {
			await db
				.update(priceList)
				.set({
					price: String(price),
					amount,
					sku: sku || null,
					reorderLevel: reorderLevel === '' || reorderLevel === undefined ? null : reorderLevel
				})
				.where(and(eq(priceList.id, id), eq(priceList.productId, Number(params.id))));

			return message(form, { type: 'success', text: 'Product Price updated Successfully!' });
		} catch (err) {
			console.error('Error editing product price:', err);
			return message(form, { type: 'error', text: 'Could not update the variant' });
		}
	},
	addPrice: async ({ request, params }) => {
		const form = await superValidate(request, zod4(addPrice));
		const { id } = params;

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { price, amount, sku, reorderLevel } = form.data;

		if (sku && (await skuTaken(sku))) {
			return message(form, { type: 'error', text: `SKU ${sku} is already used` }, { status: 400 });
		}

		try {
			await db.insert(priceList).values({
				productId: Number(id),
				price: String(price),
				amount,
				sku: sku || null,
				reorderLevel: reorderLevel === '' || reorderLevel === undefined ? null : reorderLevel
			});

			return message(form, { type: 'success', text: 'Product Price added Successfully!' });
		} catch (err) {
			console.error('Error adding product price:', err);
			return message(form, { type: 'error', text: 'Could not add the variant' });
		}
	},
	deletePrice: async ({ request, params }) => {
		const form = await superValidate(request, zod4(deletePrice));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { id, price, amount } = form.data;
		const productId = Number(params.id);

		try {
			const [variant] = await db
				.select({ quantity: priceList.quantity })
				.from(priceList)
				.where(and(eq(priceList.id, id), eq(priceList.productId, productId)));

			// Deleting it would take its batches, and the stock in them, with it.
			if (variant && variant.quantity > 0) {
				return message(
					form,
					{
						type: 'error',
						text: `${amount} still has ${variant.quantity} in stock. Remove or sell it first.`
					},
					{ status: 400 }
				);
			}

			await db.transaction(async (tx) => {
				await tx
					.delete(priceList)
					.where(and(eq(priceList.id, id), eq(priceList.productId, productId)));
				await syncProductTotal(tx, productId);
			});

			return message(form, {
				type: 'success',
				text: `Variant ${amount} with ${price} price deleted Successfully!`
			});
		} catch (err) {
			console.error('Error deleting Variant price:', err);
			return message(form, { type: 'error', text: 'Could not delete the variant' });
		}
	}
};

async function variantBelongsTo(variantId: number, productId: number) {
	const [row] = await db
		.select({ id: priceList.id })
		.from(priceList)
		.where(and(eq(priceList.id, variantId), eq(priceList.productId, productId)));
	return Boolean(row);
}

async function skuTaken(sku: string, exceptId?: number) {
	const [row] = await db
		.select({ id: priceList.id })
		.from(priceList)
		.where(and(eq(priceList.sku, sku), exceptId ? ne(priceList.id, exceptId) : undefined));
	return Boolean(row);
}

const uploadGallery = async (gallery: File[] | undefined) => {
	try {
		// 1. Map each file to the upload promise
		const uploadPromises = (gallery ?? []).map(async (file) => {
			const address = await saveUploadedFile(file);
			return address; // This is the string returned by your function
		});

		// 2. Wait for all uploads to complete and store results in an array
		const uploadedAddresses: string[] = await Promise.all(uploadPromises);

		return uploadedAddresses;
	} catch (error) {
		console.error('Error uploading gallery:', error);
		throw error;
	}
};
