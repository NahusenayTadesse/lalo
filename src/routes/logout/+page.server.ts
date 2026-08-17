import { auth } from '$lib/server/auth';
import { redirect } from 'sveltekit-flash-message/server';
import type { Actions } from './$types';

// Lives outside `/dashboard` on purpose: the admin guard in `hooks.server.ts`
// 404s every non-admin request under that prefix, which silently swallowed
// logout for customers.
export const actions: Actions = {
	default: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		redirect('/login', { type: 'success', message: 'Logout Successful' }, event.cookies);
	}
};
