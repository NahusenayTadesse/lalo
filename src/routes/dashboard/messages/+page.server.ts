import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { deleteTestimonial, markRead } from './schema.js';
import { db } from '$lib/server/db';
import { contactMessages as paymentMethods } from '$lib/server/db/schema';
import type { Actions } from './$types.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const readForm = await superValidate(zod4(markRead));
	const deleteForm = await superValidate(zod4(deleteTestimonial));

	const allPaymentMethods = await db
		.select({
			id: paymentMethods.id,
			name: paymentMethods.name,
			email: paymentMethods.email,
			phone: paymentMethods.phone,
			subject: paymentMethods.subject,
			isRead: paymentMethods.seen,
			message: paymentMethods.message,
			submittedAt: paymentMethods.createdAt
		})
		.from(paymentMethods);

	return {
		readForm,
		deleteForm,
		allPaymentMethods
	};
};

export const actions: Actions = {
	read: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(deleteTestimonial));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { id } = form.data;

		try {
			await db.update(paymentMethods).set({ seen: true }).where(eq(paymentMethods.id, id));
			return message(form, { type: 'success', text: 'Message Successfully Marked as Read' });
		} catch (err: any) {
			return message(
				form,
				{
					type: 'error',
					text: 'Error while marking message as read.'
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
			return message(form, { type: 'success', text: 'Message Successfully Deleted' });
		} catch (err: any) {
			return message(
				form,
				{
					type: 'error',
					text: 'Error while deleting message.'
				},
				{ status: 500 }
			);
		}
	}
};
