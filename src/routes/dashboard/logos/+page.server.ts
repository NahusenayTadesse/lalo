import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { editGallery } from './schema';

import { db } from '$lib/server/db';
import { gallery } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(editGallery));

	const images = await db.select().from(gallery);

	const imagesList = images.map((img) => img.imageUrl);

	return { form, gallery: imagesList };
};

import { saveUploadedFile } from '$lib/server/upload';

export const actions: Actions = {
	editGallery: async ({ request }) => {
		const form = await superValidate(request, zod4(editGallery));

		const { existing, images } = form.data;

		try {
			await db.transaction(async (tx) => {
				let galleryImages: string[] = [];

				// 1. Upload new files if they exist
				if (images && images.length > 0) {
					galleryImages = await uploadGallery(images);
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
						imageUrl: url
					}));

					// Wipe the old associations and replace with the new "finalList"
					await tx.delete(gallery);
					await tx.insert(gallery).values(imageRecords);
				} else {
					// Handle the case where all images were removed
					await tx.delete(gallery);
				}
			});

			return message(form, { type: 'success', text: 'Homepage Gallery added Successfully!' });
		} catch (err) {
			console.error('Error marking adding homepage gallery:', err);
			return message(
				form,
				{ type: 'error', text: `Unexpected Error: ${err?.message}` },
				{ status: 500 }
			);
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
