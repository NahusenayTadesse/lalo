import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { edit, adjust, damaged, editGallery, editPrice, addPrice } from './schema';

import { db } from '$lib/server/db';
import {
	products,
	productImages,
	productAdjustments,
	damagedProducts,
	prices as priceList,
	transactions
} from '$lib/server/db/schema';
import { eq, and, sql, isNotNull, desc } from 'drizzle-orm';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';

import { saveUploadedFile } from '$lib/server/upload';
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

		const { productName, category, description, quantity, supplier, reorderLevel, image } =
			form.data;

		try {
			if (image) {
				const featuredImage = await saveUploadedFile(image);

				await db
					.update(products)
					.set({
						name: productName,
						description,
						categoryId: category,
						quantity,
						supplierId: supplier ? supplier : 1,
						reorderLevel,
						updatedBy: locals?.user?.id,
						featuredImage
					})
					.where(eq(products.id, Number(id)));
			} else {
				await db
					.update(products)
					.set({
						name: productName,
						description,
						categoryId: category,
						quantity,
						supplierId: supplier ? supplier : 1,
						reorderLevel,
						updatedBy: locals?.user?.id
					})
					.where(eq(products.id, Number(id)));
			}

			return message(form, { type: 'success', text: 'Product Updated Successfully' });
		} catch (err) {
			console.error(err?.message);

			return message(form, { type: 'error', text: 'Product Update Failed' + err?.message });
		}
	},
	adjust: async ({ request, params, locals }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(adjust));

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

		const { intent, quantity, reason, employeeResponsible, costPerItem, reciept } = form.data;
		const productId = Number(id);
		const adjustment = intent === 'add' ? quantity : -quantity;
		// `productAdjustments` has no columns for these yet, so they're folded into `reason`
		// rather than silently discarded.
		const fullReason = [reason, `Employee: ${employeeResponsible}`, `Cost/unit: ${costPerItem}`]
			.filter(Boolean)
			.join(' — ');

		try {
			await db.transaction(async (tx) => {
				if (adjustment < 0) {
					const [current] = await tx
						.select({ quantity: products.quantity })
						.from(products)
						.where(eq(products.id, productId));

					if (!current || current.quantity + adjustment < 0) {
						throw new Error(
							`Cannot remove ${quantity} — only ${current?.quantity ?? 0} in stock.`
						);
					}
				}

				let transactionId: number | undefined;

				if (reciept) {
					const recieptLink = await saveUploadedFile(reciept);

					const [tranId] = await tx
						.insert(transactions)
						.values({
							amount: String(adjustment),
							recieptLink,
							createdBy: locals.user?.id
						})
						.$returningId();
					transactionId = tranId.id;
				}

				await tx.insert(productAdjustments).values({
					productsId: productId,
					adjustment,
					reason: fullReason,
					transactionId,
					createdBy: locals.user?.id
				});

				await tx
					.update(products)
					.set({
						quantity: sql`quantity + ${adjustment}`,
						updatedBy: locals.user?.id
					})
					.where(eq(products.id, productId));
			});

			return message(form, { type: 'success', text: 'Product Updated Successfully' });
		} catch (err) {
			return message(
				form,
				{ type: 'error', text: (err as Error)?.message ?? 'Unexpected error' },
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

		const { quantity, damagedBy, reason } = form.data;
		const productId = Number(id);

		try {
			await db.transaction(async (tx) => {
				const [current] = await tx
					.select({ quantity: products.quantity })
					.from(products)
					.where(eq(products.id, productId));

				if (!current || current.quantity - quantity < 0) {
					throw new Error(
						`Cannot mark ${quantity} damaged — only ${current?.quantity ?? 0} in stock.`
					);
				}

				// 1. Update damaged products record
				await tx.insert(damagedProducts).values({
					productId,
					quantity,
					createdBy: locals.user?.id,
					damagedBy,
					reason
				});

				// 2. Decrement the main product inventory
				await tx
					.update(products)
					.set({
						quantity: sql`quantity - ${quantity}`,
						updatedBy: locals.user?.id
					})
					.where(eq(products.id, productId));
			});

			return message(form, { type: 'success', text: 'Damaged supply added Successfully!' });
		} catch (err) {
			console.error('Error marking adding damaged supply:', err);
			return message(
				form,
				{ type: 'error', text: (err as Error)?.message ?? 'Unexpected error' },
				{ status: 400 }
			);
		}
	},
	editGallery: async ({ params, locals, request }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(editGallery));

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
	editPrice: async ({ request }) => {
		const form = await superValidate(request, zod4(editPrice));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { id, price, amount } = form.data;

		try {
			await db
				.update(priceList)
				.set({
					id,
					price: String(price),
					amount
				})
				.where(eq(priceList.id, id));

			return message(form, { type: 'success', text: 'Product Price updated Successfully!' });
		} catch (err) {
			console.error('Error editing product price:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	},
	addPrice: async ({ request, params }) => {
		const form = await superValidate(request, zod4(addPrice));
		const { id } = params;

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { price, amount } = form.data;

		try {
			await db.insert(priceList).values({
				productId: Number(id),
				price: String(price),
				amount
			});

			return message(form, { type: 'success', text: 'Product Price added Successfully!' });
		} catch (err) {
			console.error('Error adding product price:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	},
	deletePrice: async ({ request }) => {
		const form = await superValidate(request, zod4(editPrice));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { id, price, amount } = form.data;

		try {
			await db.delete(priceList).where(eq(priceList.id, id));

			return message(form, {
				type: 'success',
				text: `Variant ${amount} with ${price} price deleted Successfully!`
			});
		} catch (err) {
			console.error('Error deleting Variant price:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	}
};

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
