import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import {
	sendEmail,
	customerContactTemplate,
	adminContactTemplate,
	ADMIN_EMAIL
} from '$lib/server/email';
import { createRateLimiter } from '$lib/server/rate-limit';
import { contactSchema } from './schema';
import { normalizeEthiopianPhone } from '$lib/validators/phone';
import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

/** Per client IP. A person rarely sends more than a couple of messages an hour. */
const contactLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(contactSchema));

	return {
		form
	};
};

export const actions: Actions = {
	contact: async ({ request, getClientAddress }) => {
		const form = await superValidate(request, zod4(contactSchema));

		// The action emails whatever address is typed in, so without a limit it is an
		// open relay for anyone scripting the form.
		if (!contactLimiter.allow(getClientAddress())) {
			return message(
				form,
				{ type: 'error', text: 'Too many messages. Please try again later.' },
				{ status: 429 }
			);
		}
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
			await db.insert(contactMessages).values({
				name,
				phone: phoneNumber,
				email,
				subject,
				// NOT NULL column, optional field: a blank message used to fail the insert.
				message: contactMessage ?? '',
				address
			});

			// Not awaited, so the surrounding try/catch can't see a rejection — without
			// these handlers an unreachable mail server crashes the whole process.
			const adminMail = adminContactTemplate(form.data);
			sendEmail(ADMIN_EMAIL, adminMail.subject, adminMail.html).catch((err) =>
				console.error('Email Error (Admin):', err)
			);

			const userMail = customerContactTemplate(name);
			sendEmail(email, userMail.subject, userMail.html).catch((err) =>
				console.error('Email Error (Customer):', err)
			);

			return message(form, { type: 'success', text: 'Message Successfully Sent!' });
		} catch (err) {
			console.error('Contact form: could not save message:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not send your message. Please try again.' },
				{ status: 500 }
			);
		}
	}
};
