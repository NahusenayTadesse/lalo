import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth';

import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { changePasswordSchema as schema } from './schema';
import type { Actions, PageServerLoad } from './$types';
import { setFlash } from 'sveltekit-flash-message/server';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(303, '/');
	const form = await superValidate(zod4(schema));

	return { form };
};

export const actions: Actions = {
	changePassword: async ({ request }) => {
		const form = await superValidate(request, zod4(schema));
		if (!form.valid) return fail(400, { form });
		const { currentPassword, newPassword } = form.data;

		try {
			await auth.api.changePassword({
				body: {
					newPassword, // required
					currentPassword, // required
					revokeOtherSessions: true
				},
				headers: request.headers
			});

			return message(form, { type: 'success', text: 'Password changed successfully' });
		} catch (error) {
			console.error(error);
			return message(
				form,
				{ type: 'error', text: 'Error Changing Password ' + error.message },
				{ status: 400 }
			);
		}
	}
};
