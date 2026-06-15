import { fail } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';

import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema/';
import type { Actions, PageServerLoad } from './$types';
import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { ForgotPasswordSchema } from './schema';
import { redirect } from 'sveltekit-flash-message/server';
import { sendResetPasswordEmail } from '$lib/server/email';
import { generatePassword } from '$lib/global.svelte';
import { updateUserPassword } from '$lib/server/updatePassword';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/dashboard');
	}
	const form = await superValidate(zod4(ForgotPasswordSchema));

	return { form };
};

export const actions: Actions = {
	forgotPassword: async (event) => {
		const form = await superValidate(event.request, zod4(ForgotPasswordSchema));
		if (!form.valid) {
			return fail(400, { form });
		}
		try {
			const { email } = form.data;

			const result = await db
				.select()
				.from(table.user)
				.where(and(eq(table.user.email, email), eq(table.user.isActive, true)))
				.then((rows) => rows[0]);

			if (!result) {
				setError(form, 'email', 'Account with Email not Found');

				return message(form, { type: 'error', text: 'Account with Email not Found' });
			}

			const password = generatePassword();

			await updateUserPassword(result.id, password);

			await sendResetPasswordEmail(email, password);

			return message(form, { type: 'success', text: 'Reset Password sent Successfully!' });
		} catch (error) {
			console.error(error?.message);
			return message(form, {
				type: 'error',
				text: 'An error occurred while sending reset password email ' + error?.message
			});
		}
	}
};
