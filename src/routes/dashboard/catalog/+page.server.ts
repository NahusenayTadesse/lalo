import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { editGallery } from './schema';

import { db } from '$lib/server/db';
import { catalogManual } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(editGallery));

	const files = await db
		.select()
		.from(catalogManual)
		.limit(1)
		.then((rows) => rows[0]);

	return { form, files };
};

import { saveUploadedFile } from '$lib/server/upload';

export const actions: Actions = {
	editGallery: async ({ request }) => {
		const form = await superValidate(request, zod4(editGallery));

		const { manual, catalog } = form.data;

		console.log(form);

		try {
			await db.transaction(async (tx) => {
				const existing = await tx.select().from(catalogManual).limit(1);

				console.log(existing);

				if (manual) {
					const newManual = await saveUploadedFile(manual);

					if (existing.length) {
						await tx.update(catalogManual).set({
							manual: newManual
						});
					} else {
						await tx.insert(catalogManual).values({
							manual: newManual
						});
					}
				}

				if (catalog) {
					const newManual = await saveUploadedFile(catalog);

					if (existing.length) {
						await tx.update(catalogManual).set({
							catalog: newManual
						});
					} else {
						await tx.insert(catalogManual).values({
							catalog: newManual
						});
					}
				}
			});

			return message(form, { type: 'success', text: 'Catalog and Manual added Successfully!' });
		} catch (err) {
			console.error('Error marking adding Catalog and Manual:', err);
			return message(
				form,
				{ type: 'error', text: `Unexpected Error: ${err?.message}` },
				{ status: 500 }
			);
		}
	}
};
