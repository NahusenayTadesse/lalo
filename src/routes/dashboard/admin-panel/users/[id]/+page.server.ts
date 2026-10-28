import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { editUserSchema as schema } from './schema';

import { db } from '$lib/server/db';
import {
	roles,
	user,
	permissions,
	rolePermissions,
	session,
	customers
} from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from 'sveltekit-superforms';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { error } from '@sveltejs/kit';
import { ADMIN_ROLE } from '$lib/server/authz';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const form = await superValidate(zod4(schema));

	const singleUser = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			roleId: user.roleId,
			role: roles.name,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		})
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, id))
		.then((rows) => rows[0]);

	if (!singleUser) {
		error(404, { message: 'User not found' });
	}

	const roleList = await db
		.select({
			value: roles.id,
			name: roles.name
		})
		.from(roles);

	const permissionList = await db
		.select({
			id: permissions.id,
			name: permissions.name,
			description: permissions.description
		})
		.from(permissions)
		.innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
		.where(eq(rolePermissions.roleId, singleUser.roleId));

	return {
		singleUser,
		id,
		form,
		roleList,
		permissionList
	};
};

/**
 * Whether removing `userId` from the Admin role would leave nobody able to reach
 * `/dashboard` — at which point no one could undo it from the app.
 */
async function isLastAdmin(userId: string) {
	const [target] = await db
		.select({ role: roles.name })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, userId));

	if (target?.role !== ADMIN_ROLE) return false;

	const [{ admins }] = await db
		.select({ admins: count() })
		.from(user)
		.innerJoin(roles, eq(user.roleId, roles.id))
		.where(eq(roles.name, ADMIN_ROLE));

	return admins <= 1;
}

export const actions: Actions = {
	editUser: async ({ request, cookies, locals, params }) => {
		const form = await superValidate(request, zod4(schema));

		const { id } = params;

		if (!form.valid) {
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return fail(400, { form });
		}

		const { name, email, role } = form.data;

		try {
			const existingUser = await db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.email, email))
				.then((res) => res[0]);

			if (existingUser && existingUser.id !== id) {
				setError(form, 'email', 'User with this email already exists, change your email.');
				return message(
					form,
					{ type: 'error', text: 'User with this email already exists, change your email.' },
					{ status: 400 }
				);
			}

			const selectedRole = await db
				.select({ id: roles.id, name: roles.name })
				.from(roles)
				.where(eq(roles.id, role))
				.then((rows) => rows[0]);

			if (!selectedRole) {
				setError(form, 'role', 'Please choose a valid role');
				return message(
					form,
					{ type: 'error', text: 'Please choose a valid role' },
					{ status: 400 }
				);
			}

			if (selectedRole.name !== ADMIN_ROLE) {
				if (id === locals.user?.id) {
					return message(
						form,
						{ type: 'error', text: 'You cannot remove your own Admin role.' },
						{ status: 400 }
					);
				}
				if (await isLastAdmin(id)) {
					return message(
						form,
						{ type: 'error', text: 'This is the last Admin — assign another Admin first.' },
						{ status: 400 }
					);
				}
			}

			await db.transaction(async (tx) => {
				await tx.update(user).set({ name, email, roleId: selectedRole.id }).where(eq(user.id, id));
				// Signed out so the new role (and email) take effect on their next request.
				await tx.delete(session).where(eq(session.userId, id));
			});

			return message(form, { type: 'success', text: 'User Updated Successfully' });
		} catch (err) {
			console.error('Error updating user:', err);
			return message(form, { type: 'error', text: 'User Update Failed' }, { status: 500 });
		}
	},
	delete: async ({ cookies, params, locals }) => {
		const { id } = params;

		if (id === locals.user?.id) {
			setFlash({ type: 'error', message: 'You cannot delete your own account.' }, cookies);
			return fail(400);
		}

		try {
			if (await isLastAdmin(id)) {
				setFlash(
					{ type: 'error', message: 'This is the last Admin — assign another Admin first.' },
					cookies
				);
				return fail(400);
			}

			await db.transaction(async (tx) => {
				// `customers.user_id` has no ON DELETE rule. The customer record (and its
				// order history) stays, as a standalone customer with no login.
				await tx.update(customers).set({ userId: null }).where(eq(customers.userId, id));
				await tx.delete(user).where(eq(user.id, id));
			});
		} catch (err) {
			console.error('Error deleting user:', err);
			setFlash({ type: 'error', message: 'Could not delete this user.' }, cookies);
			return fail(500);
		}

		redirect(
			'/dashboard/admin-panel/users',
			{ type: 'success', message: 'User Deleted Successfully!' },
			cookies
		);
	}
};
