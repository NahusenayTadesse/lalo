import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { roles, user } from '$lib/server/db/schema';

/** The one role allowed anywhere under `/dashboard`. */
export const ADMIN_ROLE = 'Admin';

/**
 * The signed-in user's role name, or `''` when they have no role row.
 * `roleId` is nullable (`onDelete: 'set null'`), hence the left join.
 */
export async function getRoleName(userId: string): Promise<string> {
	const row = await db
		.select({ name: roles.name })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, userId))
		.then((rows) => rows[0]);

	return row?.name ?? '';
}

/**
 * Throws unless the caller is a signed-in admin.
 *
 * Reads `locals.roleName` when `hooks.server.ts` has already resolved it, so
 * calling this from a `load` or an action costs nothing extra.
 */
export async function requireAdmin(locals: App.Locals) {
	if (!locals.user) throw redirect(303, '/login');

	const roleName = locals.roleName ?? (await getRoleName(locals.user.id));
	if (roleName !== ADMIN_ROLE) throw error(404, 'Not Allowed');

	return locals.user;
}
