import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { redirect, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, customers, orders } from '$lib/server/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { editUserSchema as schema } from './schema';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(303, '/');

	const form = await superValidate(zod4(schema));

	const singleUser = await db
		.select({
			id: customers.id,
			name: user.name,
			phone: customers.phone,
			email: user.email,
			createdAt: user.createdAt,

			numberOfOrders: count(orders.id)
		})
		.from(user)
		.leftJoin(customers, eq(user.id, customers.userId))
		.leftJoin(orders, eq(customers.id, orders.customerId))
		.where(eq(user.id, locals?.user?.id))
		.then((rows) => rows[0]);

	if (!singleUser) {
		error(404, { message: 'User not found, It has been Deleted or does not exist' });
	}

	const orderCounts = await db
		.select({
			status: orders.status,
			count: sql<number>`count(${orders.id})`.mapWith(Number)
		})
		.from(orders)
		.where(eq(orders.customerId, Number(singleUser.id)))
		.groupBy(orders.status);

	// const permissionList = await db
	// 	.select({
	// 		id: permissions.id,
	// 		name: permissions.name,
	// 		description: permissions.description
	// 	})
	// 	.from(permissions)
	// 	.innerJoin(rolePermissions, eq(permissions.id, rolePermissions.permissionId))
	// 	.where(eq(rolePermissions.roleId, singleUser.roleId));

	if (!singleUser) {
		error(404, 'User with this ID not found');
	}

	return {
		singleUser,
		orderCounts,
		form
	};
};

export const actions: Actions = {
	editUser: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(schema));
		if (!locals.user) return redirect(303, '/');

		const id = locals?.user?.id;

		if (!form.valid) {
			// Stay on the same page and set a flash message
			return message(form, { type: 'error', text: 'Please check your form data.' });
		}

		const { name, phone, email } = form.data;

		try {
			const existingUser = await db
				.select()
				.from(user)
				.where(eq(user.email, email))
				.then((res) => res[0]);

			if (existingUser) {
				if (existingUser.id !== id) {
					setError(form, 'email', 'User with this email already exists, change your email.');
					return message(
						form,
						{
							type: 'error',
							text: 'User with this email already exists, change your email.'
						},
						{ status: 400 }
					);
				}
			}

			await db.transaction(async (tx) => {
				await tx
					.update(user)
					.set({
						name,
						email
					})
					.where(eq(user.id, id));

				const customer = await tx
					.select({
						id: customers.id
					})
					.from(customers)
					.where(eq(customers.userId, id))
					.then((res) => res[0]);

				if (customer) {
					await tx
						.update(customers)
						.set({
							name,
							phone,
							email
						})
						.where(eq(customers.userId, id));
				}
			});

			// Client-side (to sync the changes)

			// Stay on the same page and set a flash message
			return message(form, { type: 'success', text: 'Your Details have Updated Successfully' });
		} catch (err) {
			console.error(err);

			if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
				return message(
					form,
					{
						type: 'error',
						text: 'User with this email already exists, change your email.'
					},
					{ status: 400 }
				);
			}
			return message(
				form,
				{
					type: 'error',
					text: 'Update Failed: ' + err?.message
				},
				{ status: 500 }
			);
		}
	}
};
