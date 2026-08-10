import type { Handle } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { ADMIN_ROLE, getRoleName } from '$lib/server/authz';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	// Form actions run *before* any `load`, so the admin check in
	// `dashboard/+layout.server.ts` can never stop a POST — by the time it runs, the
	// action has already written to the database and the check only affects the
	// re-render. Guarding here is what actually enforces it, because `handle` wraps
	// every request regardless of method: page loads, `?/add`, `?/edit`, `?/delete`.
	if (!building && event.url.pathname.startsWith('/dashboard')) {
		if (!event.locals.user) throw redirect(303, '/login');

		// Cached on `locals` so the layout and any `requireAdmin()` call reuse it
		// instead of issuing the same join again.
		event.locals.roleName = await getRoleName(event.locals.user.id);
		if (event.locals.roleName !== ADMIN_ROLE) throw error(404, 'Not Allowed');
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
