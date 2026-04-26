import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import { sendEmail, customerContactTemplate, adminContactTemplate } from '$lib/server/email';
import { USER } from '$env/static/private';
import { contactSchema } from './schema';
import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(contactSchema));

	return {
		form
	};
};

export const actions: Actions = {
	contact: async ({ request }) => {
		const form = await superValidate(request, zod4(contactSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, phoneNumber, email, subject, contactMessage, address } = form.data;

		try {
			await db
				.insert(contactMessages)
				.values({ name, phone: phoneNumber, email, subject, message: contactMessage, address });

			const adminMail = adminContactTemplate(form.data);
			sendEmail(USER, adminMail.subject, adminMail.html);

			const userMail = customerContactTemplate(name, subject);
			sendEmail(email, userMail.subject, userMail.html);

			return message(form, { type: 'success', text: 'Message Successfully Sent!' });
		} catch (err) {
			return message(form, {
				type: 'error',
				text: 'Error Adding Messages: ' + err?.message
			});
		}
	}
};
