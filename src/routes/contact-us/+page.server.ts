import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import { sendEmail, customerContactTemplate, adminContactTemplate } from '$lib/server/email';
import { USER } from '$env/static/private';
import { contactSchema } from './schema';
import { normalizeEthiopianPhone } from '$lib/validators/phone';
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

		// The schema has already accepted the number; this only settles which of the
		// forms it was typed in, so every stored number reads `+251XXXXXXXXX`. Written
		// back onto `form.data` so the admin notification quotes the same thing the
		// row holds.
		form.data.phoneNumber = normalizeEthiopianPhone(form.data.phoneNumber) as string;

		const { name, phoneNumber, email, subject, contactMessage, address } = form.data;

		try {
			await db
				.insert(contactMessages)
				.values({ name, phone: phoneNumber, email, subject, message: contactMessage, address });

			// Not awaited, so the surrounding try/catch can't see a rejection — without
			// these handlers an unreachable mail server crashes the whole process.
			const adminMail = adminContactTemplate(form.data);
			sendEmail(USER, adminMail.subject, adminMail.html).catch((err) =>
				console.error('Email Error (Admin):', err)
			);

			const userMail = customerContactTemplate(name, subject);
			sendEmail(email, userMail.subject, userMail.html).catch((err) =>
				console.error('Email Error (Customer):', err)
			);

			return message(form, { type: 'success', text: 'Message Successfully Sent!' });
		} catch (err) {
			return message(form, {
				type: 'error',
				text: 'Error Adding Messages: ' + err?.message
			});
		}
	}
};
