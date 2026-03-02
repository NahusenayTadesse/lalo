import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { editRoleSchema as schema } from './schema';

import { db } from '$lib/server/db';
import { roles, user, permissions, rolePermissions, session } from '$lib/server/db/schema';
import { eq, countDistinct, and } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const form = await superValidate(zod4(schema));

	const singleUser = await db
		.select({
			id: roles.id,
			name: roles.name,
			description: roles.description,
			userCount: countDistinct(user.id),
			permissionsCount: countDistinct(rolePermissions.id)
		})
		.from(roles)
		.leftJoin(
			user,
			and(
				eq(user.roleId, roles.id),
				eq(user.isActive, true) // Filter happens DURING the join
			)
		)
		.leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
		.groupBy(roles.id)
		.where(eq(roles.id, id))
		.then((rows) => rows[0]);

	if (!singleUser) {
		return error(404, { message: 'Role not found' });
	}

	const permissionList = await db
		.select({
			id: permissions.id,
			name: permissions.name,
			description: permissions.description
		})
		.from(permissions)
		.innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))

		.where(eq(rolePermissions.roleId, id));

	const userList = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
			isActive: user.isActive
		})
		.from(user)
		.where(eq(user.roleId, id));

	return {
		singleUser,
		id,
		form,
		userList,

		permissionList
	};
};

// import { saveUploadedFile } from '$lib/server/upload';

export const actions: Actions = {
	edit: async ({ request, params }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, description, permissions } = form.data;

		try {
			await db
				.update(roles)
				.set({ name, description })
				.where(eq(roles.id, Number(id)));

			await db.delete(rolePermissions).where(eq(rolePermissions.roleId, Number(id)));

			await db.insert(rolePermissions).values(
				permissions.map((permId) => ({
					roleId: Number(id),
					permissionId: Number(permId)
				}))
			);

			return message(form, { type: 'success', text: 'Role updated successfully.' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY')
				return setError(form, 'name', 'Role updated already exists.');

			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Role Name is already taken. Please choose another one.'
						: err.message
			});
		}
	},
	delete: async ({ params, cookies }) => {
		const { id } = params;

		try {
			await db.delete(roles).where(eq(roles.id, Number(id)));

			setFlash({ type: 'success', message: 'Role Deleted Successfully!' }, cookies);
		} catch (err: any) {
			setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
			return fail(400);
		}
	}
} satisfies Actions;
