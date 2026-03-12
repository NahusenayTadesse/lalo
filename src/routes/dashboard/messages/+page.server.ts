import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import { setFlash } from 'sveltekit-flash-message/server';
import { deleteSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(deleteSchema));

	const messages = await db
		.select({
			id: contactMessages.id,
			name: contactMessages.name,
			phone: contactMessages.phone,
			email: contactMessages.email,
			date: contactMessages.createdAt,
			subject: contactMessages.subject,
			message: contactMessages.message
		})
		.from(contactMessages);

	return {
		messages,
		form
	};
};

export const actions: Actions = {
	delete: async ({ request, cookies }) => {
		try {
			const form = await superValidate(request, zod4(deleteSchema));
			if (!form.valid) {
				return message(form, { type: 'error', text: 'Please check the form for Errors' });
			}

			const { id } = form.data;
			await db.delete(contactMessages).where(eq(contactMessages.id, id));

			return message(form, { type: 'success', text: 'Delete Successful!' });
		} catch (err) {
			console.error('Error' + err.message);
			return message(
				form,
				{ type: 'error', text: 'An Error occured while deleting' + err.message },
				{ status: 500 }
			);
		}
	}
};
