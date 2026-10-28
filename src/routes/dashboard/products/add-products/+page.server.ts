import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { add } from './schema';
import { db } from '$lib/server/db';
import {
	products as inventory,
	productCategories,
	productImages,
	prices as priceList,
	productSuppliers as suppliers
} from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allCategories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.where(eq(productCategories.isActive, true));
	const form = await superValidate(zod4(add));

	const supplierList = await db
		.select({
			value: suppliers.id,
			name: suppliers.name
		})
		.from(suppliers)
		.where(eq(suppliers.isActive, true));

	return {
		form,
		allCategories,
		supplierList
	};
};

import { deleteUploadedFile, saveUploadedFile } from '$lib/server/upload.js';

export const actions: Actions = {
	addProduct: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return message(form, { type: 'error', text: 'Please check your form data.' });
		}

		const {
			productName,
			category,
			description,
			quantity,

			supplier,
			reorderLevel,
			image,
			gallery
		} = form.data;

		// Files are written before the transaction, so a slow upload doesn't hold a
		// connection open — and deleted again if the insert fails, so a failed save
		// doesn't leave orphaned files behind.
		const uploaded: string[] = [];
		let productId: number;

		try {
			const featuredImage = await saveUploadedFile(image);
			uploaded.push(featuredImage);
			const galleryImages = await uploadGallery(gallery);
			uploaded.push(...galleryImages);

			productId = await db.transaction(async (tx) => {
				const [product] = await tx
					.insert(inventory)
					.values({
						name: productName,
						categoryId: category,
						description,
						quantity,
						supplierId: supplier || null,
						reorderLevel,
						featuredImage,
						// Commission is hidden from the add-product form for now; default to 0
						// rather than leaving this NOT NULL decimal column unset.
						commissionAmount: '0',
						createdBy: locals?.user?.id
					})
					.$returningId();

				if (galleryImages.length > 0) {
					await tx
						.insert(productImages)
						.values(galleryImages.map((url) => ({ productId: product.id, imageUrl: url })));
				}

				return product.id;
			});
		} catch (err) {
			console.error('Add product failed:', err);
			await Promise.all(uploaded.map((name) => deleteUploadedFile(name)));
			return message(
				form,
				{ type: 'error', text: 'An error occurred while adding the product.' },
				{ status: 500 }
			);
		}

		redirect(
			`/dashboard/products/single/${productId}`,
			{ type: 'success', message: 'New Product Successfully Added' },
			cookies
		);
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
