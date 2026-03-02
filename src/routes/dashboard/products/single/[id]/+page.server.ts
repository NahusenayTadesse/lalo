import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { edit, adjust, damaged, editGallery } from './schema';

import { db } from '$lib/server/db';
import {
	products,
	productImages,
	productAdjustments,
	damagedProducts,
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

		const { productName, category, description, quantity, price, supplier, reorderLevel, image } =
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
						price: price.toString(),
						supplierId: supplier,
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
						price: price.toString(),
						supplierId: supplier,
						reorderLevel,
						updatedBy: locals?.user?.id
					})
					.where(eq(products.id, Number(id)));
			}

			// Stay on the same page and set a flash message
			setFlash({ type: 'success', message: 'Product Updated Successuflly Added' }, cookies);

			return message(form, { type: 'success', text: 'Product Updated Successfully' });
		} catch (err) {
			setFlash({ type: 'error', message: 'Product Update Failed ' + err?.message }, cookies);

			return message(form, { type: 'error', text: 'Product Update Failed' + err?.message });
		}
	},
	adjust: async ({ request, cookies, params, locals }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(adjust));

		const { intent, quantity, reason, reciept } = form.data;

		try {
			if (!id) {
				setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
				return fail(400);
			}
			const adjustment = intent === 'add' ? Number(quantity) : -Number(quantity);

			if (reciept) {
				const recieptLink = await saveUploadedFile(reciept);

				const [transactionId] = await db
					.insert(transactions)
					.values({
						amount: adjustment,
						recieptLink,
						createdBy: locals.user?.id
					})
					.$returningId();

				await db.insert(productAdjustments).values({
					productsId: Number(id),
					adjustment,
					reason,
					transactionId: transactionId.id,
					createdBy: locals.user?.id
				});
				await db
					.update(products)
					.set({
						quantity: sql`quantity + ${adjustment}`,
						updatedBy: locals.user?.id
					})
					.where(eq(products.id, Number(id)));
			} else {
				await db.insert(productAdjustments).values({
					productsId: id,
					adjustment,
					reason,
					createdBy: locals.user?.id
				});

				await db
					.update(products)
					.set({
						quantity: sql`quantity + ${adjustment}`,
						updatedBy: locals?.user?.id
					})
					.where(eq(products.id, Number(id)));
			}

			return message(form, { type: 'success', text: 'Product Updated Successfully' });
		} catch (err) {
			return message(form, { type: 'error', text: 'Unexpected Error' + err?.message });
		}
	},
	delete: async ({ cookies, params }) => {
		const { id } = params;

		try {
			if (!id) {
				setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
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

		const { quantity, damagedBy, reason } = form.data;

		try {
			if (!id) {
				return message(form, { type: 'error', text: 'Unexpected Error: Product ID not provided' });
			}

			await db.transaction(async (tx) => {
				// 1. Update damaged products record
				await tx.insert(damagedProducts).values({
					productId: Number(id),
					quantity: Number(quantity),
					createdBy: locals.user?.id,
					damagedBy,
					reason
				});

				// 2. Decrement the main product inventory
				await tx
					.update(products)
					.set({
						quantity: sql`quantity - ${Number(quantity)}`,
						updatedBy: locals.user?.id
					})
					.where(eq(products.id, Number(id)));
			});

			return message(form, { type: 'success', text: 'Damaged supply added Successfully!' });
		} catch (err) {
			console.error('Error marking adding damaged supply:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
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
	}
};

const uploadGallery = async (gallery: File[] | undefined) => {
	try {
		// 1. Map each file to the upload promise
		const uploadPromises = gallery.map(async (file) => {
			const address = await saveUploadedFile(file);
			return address; // This is the string returned by your function
		});

		// 2. Wait for all uploads to complete and store results in an array
		const uploadedAddresses: string[] = await Promise.all(uploadPromises);

		console.log('All files uploaded:', uploadedAddresses);

		return uploadedAddresses;
	} catch (error) {
		console.error('Error uploading gallery:', error);
		throw error;
	}
};
