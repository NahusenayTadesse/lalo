// import { encodeBase32LowerCase } from '@oslojs/encoding';

import type { Actions, PageServerLoad } from './$types';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/ZodSchema';
import { redirect } from 'sveltekit-flash-message/server';
import { auth } from '$lib/server/auth';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		return redirect(302, '/dashboard');
	}
	const form = await superValidate(zod4(loginSchema));

	return { form };
};

export const actions: Actions = {
	login: async (event) => {
		const form = await superValidate(event.request, zod4(loginSchema));
		if (!form.valid) {
			return message(
				form,
				{
					type: 'error',
					text: 'Please Check the form}'
				},
				{
					status: 500
				}
			);
		}

		const { email, password } = form.data;

		const result = await auth.api.signInEmail({
			body: {
				email,
				password,
				callbackURL: '/auth/verification-success'
			}
		});

		if (!result.user) {
			setError(form, 'email', 'Invalid email or password');
			setError(form, 'password', 'Invalid email or password');
			return message(
				form,
				{
					type: 'error',
					text: 'An error occurred while logging in'
				},
				{
					status: 500
				}
			);
		}

		redirect('/dashboard', { type: 'success', message: 'Login Successful!' }, event.cookies);
	}
};
