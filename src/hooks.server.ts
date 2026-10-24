import { m } from '$lib/paraglide/messages.js';
import { getTextDirection } from '$lib/paraglide/runtime.js';
import { paraglideMiddleware } from '$lib/paraglide/server.js';
import { error, type Handle, type RequestEvent } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { configureKit } from '@nahu/admin-kit/server/db';
import { kitHandle, type Grant } from '@nahu/admin-kit/server/hooks';
import { db } from '$lib/server/db';
import { access } from '$lib/access';
import { ADMIN_ROLE, getRoleName } from '$lib/server/authz';

configureKit({ db, loginPath: '/login' });

const handleSession: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return resolve(event);
};

/**
 * Admins hold the whole dashboard; nobody else holds anything. The role is only looked up for
 * dashboard requests, and cached on `locals` so `requireAdmin()` and the file route reuse it.
 */
async function loadGrant(event: RequestEvent): Promise<Grant> {
	const { user } = event.locals;
	if (!user || !access.guards(event.url.pathname)) return { permList: [], isSuperAdmin: false };

	event.locals.roleName ??= await getRoleName(user.id);
	return { permList: [], isSuperAdmin: event.locals.roleName === ADMIN_ROLE };
}

/**
 * A signed-in customer gets a 404 under `/dashboard`, not the kit's 403, so the admin area does
 * not announce itself.
 */
const hideDashboard: Handle = async ({ event, resolve }) => {
	if (event.locals.user && access.guards(event.url.pathname)) {
		const grant = await loadGrant(event);
		if (!grant.isSuperAdmin) error(404, m.error_not_allowed());
	}
	return resolve(event);
};

// Enforced here rather than in the dashboard layout: form actions run before any `load`, so only
// `handle` can stop a POST to `?/add`, `?/edit` or `?/delete` from a signed-out or non-admin user.
const handleAccess = kitHandle({ access, permissions: loadGrant });

const handleBetterAuth: Handle = ({ event, resolve }) =>
	svelteKitHandler({ event, resolve, auth, building });

// First, so every later hook, load and action runs inside the request's locale.
const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		);
	});

export const handle: Handle = sequence(
	handleParaglide,
	handleSession,
	hideDashboard,
	handleAccess,
	handleBetterAuth
);
