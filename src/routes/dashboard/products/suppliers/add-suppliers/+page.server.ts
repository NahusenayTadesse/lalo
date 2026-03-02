import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit } from '../schema';
import { db } from '$lib/server/db';
import { productSuppliers as supplySuppliers, supplies } from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

	const allData = await db
		.select({
			id: supplySuppliers.id,
			name: supplySuppliers.name,
			phone: supplySuppliers.phone,
			email: supplySuppliers.email,

			status: supplySuppliers.isActive
		})
		.from(supplySuppliers);

	return {
		form,
		editForm,
		allData
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const {
			name,

			phone,
			description,
			status
		} = form.data;

		try {
			await db.insert(supplySuppliers).values({
				name,
				phone,
				description,
				isActive: status,
				createdBy: locals?.user?.id
			});

			return message(form, { type: 'success', text: 'Supplier   Successfully Added' });
		} catch (err: any) {
			return message(form, {
				type: 'error',
				text: 'Error: ' + err?.message
			});
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { id, name, phone, description, status } = form.data;

		try {
			await db
				.update(supplySuppliers)
				.set({ name, phone, description, isActive: status, createdBy: locals?.user?.id })
				.where(eq(supplySuppliers.id, Number(id)));
			return message(form, { type: 'success', text: 'Department Successfully Updated' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') return;
			setError(form, 'name', 'Supplier name already exists.');
			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Supplier name is already taken. Please choose another one.'
						: err.message
			});
		}
	}
};
