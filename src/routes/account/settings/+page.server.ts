import { m } from '$lib/paraglide/messages.js';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { redirect, error } from '@sveltejs/kit';
import { localized } from '$lib/server/localize';
import { db } from '$lib/server/db';
import { user, customers, orders } from '$lib/server/db/schema';
import { eq, count, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { editUserSchema as schema } from './schema';
import { placeNames } from '$lib/server/db/schema';
import { normalizeEthiopianPhone } from '$lib/validators/phone';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(303, '/');

	const form = await superValidate(zod4(schema));

	const placeList = await db
		.select({
			value: placeNames.name,
			name: localized(placeNames.name, placeNames.nameAm)
		})
		.from(placeNames)
		.where(eq(placeNames.isActive, true));

	const singleUser = await db
		.select({
			id: customers.id,
			name: user.name,
			phone: customers.phone,
			email: user.email,
			createdAt: user.createdAt,

			numberOfOrders: count(orders.id),
			address: customers.address,
			deliveryAddress: customers.deliveryAddress
		})
		.from(user)
		.leftJoin(customers, eq(user.id, customers.userId))
		.leftJoin(orders, eq(customers.id, orders.customerId))
		.where(eq(user.id, locals?.user?.id))
		.then((rows) => rows[0]);

	if (!singleUser) {
		error(404, { message: m.settings_user_not_found() });
	}

	const orderCounts = await db
		.select({
			status: orders.status,
			count: sql<number>`count(${orders.id})`.mapWith(Number)
		})
		.from(orders)
		.where(eq(orders.customerId, Number(singleUser.id)))
		.groupBy(orders.status);

	if (!singleUser) {
		error(404, m.settings_user_not_found());
	}

	return {
		singleUser,
		orderCounts,
		form,
		placeList
	};
};

export const actions: Actions = {
	editUser: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(schema));
		if (!locals.user) return redirect(303, '/');

		const id = locals?.user?.id;

		if (!form.valid) {
			// Stay on the same page and set a flash message
			return message(form, { type: 'error', text: m.form_check_errors() });
		}

		const { name, email, address, deliveryAddress } = form.data;
		// Stored as `+251XXXXXXXXX` (or NULL), the one shape the rest of the app uses.
		const phone = normalizeEthiopianPhone(form.data.phone) ?? null;

		try {
			const existingUser = await db
				.select()
				.from(user)
				.where(eq(user.email, email))
				.then((res) => res[0]);

			if (existingUser) {
				if (existingUser.id !== id) {
					setError(form, 'email', m.settings_email_taken());
					return message(
						form,
						{
							type: 'error',
							text: m.settings_email_taken()
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
							email,
							address,
							deliveryAddress
						})
						.where(eq(customers.userId, id));
				}
			});

			// Client-side (to sync the changes)

			// Stay on the same page and set a flash message
			return message(form, { type: 'success', text: m.settings_updated() });
		} catch (err) {
			console.error(err);

			if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
				return message(
					form,
					{
						type: 'error',
						text: m.settings_email_taken()
					},
					{ status: 400 }
				);
			}
			return message(
				form,
				{
					type: 'error',
					text: m.settings_update_failed({ reason: err?.message ?? '' })
				},
				{ status: 500 }
			);
		}
	}
};
