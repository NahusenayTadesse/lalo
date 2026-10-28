import { m } from '$lib/paraglide/messages.js';
// import { encodeBase32LowerCase } from '@oslojs/encoding';

import type { Actions, PageServerLoad } from './$types';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/ZodSchema';
import { redirect } from 'sveltekit-flash-message/server';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals, parent }) => {
	if (locals.user) {
		const roleName = (await parent()).roleName;

		if (roleName === 'Admin') {
			return redirect(302, '/dashboard');
		} else return redirect(302, '/');
	}
	const form = await superValidate(zod4(loginSchema));

	return { form };
};
import { APIError } from 'better-auth';

export const actions: Actions = {
	login: async (event) => {
		const form = await superValidate(event.request, zod4(loginSchema));
		if (!form.valid) {
			return message(
				form,
				{
					type: 'error',
					text: m.form_check_errors()
				},
				{
					status: 400
				}
			);
		}

		const { email, password } = form.data;

		try {
			const result = await auth.api.signInEmail({
				body: {
					email,
					password,
					callbackURL: '/auth/verification-success'
				}
			});

			if (!result.user) {
				setError(form, 'email', m.login_invalid());
				setError(form, 'password', m.login_invalid());
				return message(
					form,
					{
						type: 'error',
						text: m.login_error()
					},
					{
						status: 500
					}
				);
			}

			return message(form, {
				type: 'success',
				text: m.login_success()
			});
		} catch (error) {
			if (error instanceof APIError) {
				return message(
					form,
					{
						type: 'error',
						// better-auth's own messages are English only; the common one is mapped.
						text:
							error.body?.code === 'INVALID_EMAIL_OR_PASSWORD' ? m.login_invalid() : error?.message
					},
					{
						// Wrong email/password is the caller's mistake, not a server error.
						status: 400
					}
				);
			}
			return message(
				form,
				{
					type: 'error',
					text: m.login_failed()
				},
				{
					status: 500
				}
			);
		}
	}
};
