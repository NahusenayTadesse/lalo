// import { encodeBase32LowerCase } from '@oslojs/encoding';

import type { Actions, PageServerLoad } from './login/$types';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { add } from './schema';
import { redirect } from 'sveltekit-flash-message/server';
import { auth } from '$lib/server/auth';
import { eq, and, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { APIError } from 'better-auth';
import { orders, orderItems, roles, user, products, customers } from '$lib/server/db/schema';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		const roleName = await db
			.select({ name: roles.name })
			.from(user)
			.leftJoin(roles, eq(user.roleId, roles.id))
			.where(eq(user.id, event.locals.user.id))
			.then((rows) => rows[0]);

		if (roleName.name === 'Admin') {
			return redirect(302, '/dashboard');
		} else return redirect(302, '/');
	}
	const form = await superValidate(zod4(add));

	return { form };
};

export const actions: Actions = {
	signup: async (event) => {
		const form = await superValidate(event.request, zod4(add));
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

		const { name, email, password, phone } = form.data;

		try {
			await db.transaction(async (tx) => {
				const newCustomer = await auth.api.signUpEmail({
					body: {
						email,
						password,
						name,
						callbackURL: '/auth/verification-success'
					}
				});
				await tx
					.update(user)
					.set({
						roleId: 2
					})
					.where(eq(user.id, newCustomer?.user.id));
				await tx.insert(customers).values({ email, name, phone, userId: newCustomer?.user.id });
			});

			return message(form, {
				type: 'success',
				text: 'Sign Up Successful!'
			});
		} catch (error) {
			if (error instanceof APIError) {
				return message(
					form,
					{
						type: 'error',
						text: error?.message
					},
					{
						status: 500
					}
				);
			}
			return message(
				form,
				{
					type: 'error',
					text: 'Registration Failed'
				},
				{
					status: 500
				}
			);
		}
	}
};
