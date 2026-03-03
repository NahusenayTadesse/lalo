import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, count } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { products, productSuppliers as supplySuppliers } from '$lib/server/db/schema/';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
export const load: PageServerLoad = async ({ params }) => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));
	const { id } = params;

	const single = await db
		.select({
			id: supplySuppliers.id,
			name: supplySuppliers.name,
			phone: supplySuppliers.phone,
			email: supplySuppliers.email,
			userCount: count(products.id),
			description: supplySuppliers.description,
			status: supplySuppliers.isActive
		})
		.from(supplySuppliers)
		.leftJoin(products, eq(products.supplierId, supplySuppliers.id))
		.where(eq(supplySuppliers.id, Number(id)))
		.groupBy(supplySuppliers.id)
		.then((rows) => rows[0]);

	return {
		form,
		editForm,
		single
	};
};

export const actions: Actions = {
	edit: async ({ request, params }) => {
		const form = await superValidate(request, zod4(edit));
		const { id } = params;
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, subcity, email, phone, description, status } = form.data;

		try {
			await db
				.update(supplySuppliers)
				.set({
					name,
					phone,
					email,
					description,
					isActive: status
				})
				.where(eq(supplySuppliers.id, Number(id)));

			return message(form, { type: 'success', text: 'Supplier Successfully Updated' });
		} catch (err: any) {
			return message(form, {
				type: 'error',
				text: 'Error: ' + err?.message
			});
		}
	}
};
