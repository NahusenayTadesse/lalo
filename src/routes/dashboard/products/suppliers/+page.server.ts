import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { productSuppliers as supplySuppliers } from '$lib/server/db/schema';
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
			description: supplySuppliers.description,
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
	add: async ({ request }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const {
			name,
			subcity,
			street,
			kebele,
			buildingNumber,
			floor,
			houseNumber,
			phone,
			description
		} = form.data;

		try {
			const [addressId] = await db
				.insert(address)
				.values({
					subcity,
					street,
					kebele,
					buildingNumber,
					floor,
					houseNumber
				})
				.$returningId();

			await db.insert(supplySuppliers).values({
				name,
				phone,
				description,
				address: addressId.id,
				status: status
			});

			return message(form, { type: 'success', text: 'Supplier   Successfully Added' });
		} catch (err: any) {
			return message(form, {
				type: 'error',
				text: 'Error: ' + err?.message
			});
		}
	},
	edit: async ({ request }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { id, name, phone, location, description, status } = form.data;

		try {
			await db
				.update(supplySuppliers)
				.set({ name, phone, location, description, status })
				.where(eq(supplySuppliers.id, id));
			return message(form, { type: 'success', text: 'Department Successfully Updated' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') return;
			setError(form, 'name', 'Department name already exists.');
			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Department name is already taken. Please choose another one.'
						: err.message
			});
		}
	}
};
