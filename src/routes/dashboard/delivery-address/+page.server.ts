import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit, free } from './schema';
import { db } from '$lib/server/db';
import { placeNames as department, freeDelivery } from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));
	const freeForm = await superValidate(zod4(free));

	const [freeData] = await db
		.select({
			threshold: freeDelivery.threshold,
			suggestionThreshold: freeDelivery.suggestionThreshold
		})
		.from(freeDelivery)
		.limit(1);

	const allData = await db
		.select({
			id: department.id,
			name: department.name,
			fee: department.fee,
			status: department.isActive
		})
		.from(department);

	return {
		form,
		editForm,
		allData,
		freeForm,
		freeData
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, fee, status } = form.data;

		try {
			await db.insert(department).values({
				name,
				fee: String(fee),
				isActive: status,
				createdBy: locals?.user?.id
			});

			return message(form, { type: 'success', text: 'Delivery Address Successfully Added' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') {
				setError(form, 'name', 'Delivery area already exists.');
				return message(
					form,
					{ type: 'error', text: 'Delivery area already exists.' },
					{ status: 400 }
				);
			}
			console.error('Add delivery area failed:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not add the delivery area' },
				{ status: 500 }
			);
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { id, name, fee, status } = form.data;

		try {
			await db
				.update(department)
				.set({ name, fee: String(fee), isActive: status, updatedBy: locals?.user?.id })
				.where(eq(department.id, Number(id)));
			return message(form, { type: 'success', text: 'Delivery Address Successfully Updated' });
		} catch (err: any) {
			// This used to return nothing on a duplicate (so the dialog did nothing) and
			// report every *other* error as a duplicate name.
			if (err.code === 'ER_DUP_ENTRY') {
				setError(form, 'name', 'Delivery area already exists.');
				return message(
					form,
					{ type: 'error', text: 'Delivery area already exists.' },
					{ status: 400 }
				);
			}
			console.error('Update delivery area failed:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not update the delivery area' },
				{ status: 500 }
			);
		}
	},
	free: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(free));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { threshold, suggestionThreshold } = form.data;

		try {
			// One transaction: if the insert failed after the delete, the settings were gone.
			await db.transaction(async (tx) => {
				await tx.delete(freeDelivery);
				await tx.insert(freeDelivery).values({
					threshold: String(threshold),
					suggestionThreshold: String(suggestionThreshold)
				});
			});

			return message(form, {
				type: 'success',
				text: 'Free Delivery Settings Successfully Updated'
			});
		} catch (err: any) {
			console.error('Free delivery update failed:', err);
			return message(form, { type: 'error', text: 'Could not save the settings' }, { status: 500 });
		}
	}
};
