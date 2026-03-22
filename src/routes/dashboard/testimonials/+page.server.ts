import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import {
	paymentMethod as schema,
	editPaymentMethod as editSchema,
	deleteTestimonial
} from './schema.js';
import { db } from '$lib/server/db';
import { testimonials as paymentMethods, user } from '$lib/server/db/schema';
import type { Actions } from './$types.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(schema));
	const editForm = await superValidate(zod4(editSchema));
	const deleteForm = await superValidate(zod4(deleteTestimonial));

	const allPaymentMethods = await db
		.select({
			id: paymentMethods.id,
			name: paymentMethods.name,
			position: paymentMethods.position,
			testimonial: paymentMethods.message,
			createdBy: user.name,
			createdById: paymentMethods.createdBy
		})
		.from(paymentMethods)
		.leftJoin(user, eq(user.id, paymentMethods.createdBy));

	return {
		form,
		editForm,
		deleteForm,
		allPaymentMethods
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, position, testimonial } = form.data;

		try {
			await db.insert(paymentMethods).values({
				name,
				position,
				message: testimonial,
				createdBy: locals.user?.id
			});

			return message(form, { type: 'success', text: 'Testimonial Successfully Created' });
		} catch (err: any) {
			return message(
				form,
				{
					type: 'error',
					text: 'Error while creating testimonial.'
				},
				{ status: 500 }
			);
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { id, name, position, testimonial } = form.data;

		try {
			await db
				.update(paymentMethods)
				.set({ name, position, message: testimonial, updatedBy: locals?.user?.id })
				.where(eq(paymentMethods.id, id));
			return message(form, { type: 'success', text: 'Testimonial Successfully Updated' });
		} catch (err: any) {
			return message(
				form,
				{
					type: 'error',
					text: 'Error while updating testimonial.'
				},
				{ status: 500 }
			);
		}
	},
	delete: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(deleteTestimonial));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { id } = form.data;

		try {
			await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
			return message(form, { type: 'success', text: 'Testimonial Successfully Deleted' });
		} catch (err: any) {
			return message(
				form,
				{
					type: 'error',
					text: 'Error while deleting testimonial.'
				},
				{ status: 500 }
			);
		}
	}
};
