// import { encodeBase32LowerCase } from '@oslojs/encoding';

import type { Actions, PageServerLoad } from '../$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { add } from './schema';
import { auth } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { APIError } from 'better-auth';
import { user, roles } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const allRoles = await db
		.select({
			value: roles.id,
			name: roles.name
		})
		.from(roles);

	return { form, allRoles };
};

export const actions: Actions = {
	add: async (event) => {
		const form = await superValidate(event.request, zod4(add));
		console.log(form);
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

		const { name, email, password, role } = form.data;

		try {
			await db.transaction(async (tx) => {
				const newCustomer = await auth.api.createUser({
					body: {
						email,
						password,
						name,
						role: role === 1 ? 'admin' : 'user'
					}
				});
				await tx
					.update(user)
					.set({
						roleId: 1
					})
					.where(eq(user.id, newCustomer?.user.id));
			});

			return message(form, {
				type: 'success',
				text: 'User Added Successful!'
			});
		} catch (error) {
			console.error(error);
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
					text: 'Registration Failed' + error?.message
				},
				{
					status: 500
				}
			);
		}
	}
};
