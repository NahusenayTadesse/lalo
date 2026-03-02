import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fail } from '@sveltejs/kit';

import { addUserSchema as schema } from '$lib/ZodSchema';
import { db } from '$lib/server/db';
import { roles, user } from '$lib/server/db/schema/';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
import { hash } from '@node-rs/argon2';
// import { encodeBase32LowerCase } from '@oslojs/encoding';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(schema));

	const allRoles = await db
		.select({
			value: roles.id,
			name: roles.name
		})
		.from(roles);

	return {
		form,
		allRoles
	};
};

import { setFlash } from 'sveltekit-flash-message/server';
import { extractUsername, generateUserId } from '$lib/global.svelte';

export const actions: Actions = {
	addUser: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			setFlash({ type: 'error', message: 'Please check the form for Errors' }, cookies);

			return fail(400, {
				form
			});
		}

		const { name, email, role, password } = form.data;

		const username = extractUsername(email);

		const passwordHash = await hash(password, {
			// recommended minimum parameters
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});
		const id = generateUserId();

		try {
			await db.insert(user).values({
				id,
				username,
				name,
				email,
				roleId: role,
				passwordHash,
				createdBy: locals.user?.id,
				branchId: locals.user?.branch
			});

			setFlash({ type: 'success', message: 'User Successfully Created' }, cookies);

			return message(form, { type: 'success', text: 'User Successfully Created' });
		} catch (err: any) {
			setFlash(
				{
					type: 'error',
					message:
						err.code === 'ER_DUP_ENTRY'
							? 'Email is already taken. Please choose another one.'
							: err.message
				},
				cookies
			);
			if (err.code === 'ER_DUP_ENTRY') return setError(form, 'email', 'E-mail already exists.');

			return message(form, {
				type: 'error',
				text: err.message
			});
		}
	}
};

// function generateUserId() {
//     // ID with 120 bits of entropy, or about the same as UUID v4.
//     const bytes = crypto.getRandomValues(new Uint8Array(15));
//     const id = encodeBase32LowerCase(bytes);
//     return id;
// }

// function extractUsername(email: string) {
//   if (typeof email !== "string") {
//     throw new Error("Input must be a string");
//   }

//   // Find the part before the '@'
//   const atIndex = email.indexOf("@");

//   if (atIndex === -1) {
//     throw new Error("Invalid email address: missing '@'");
//   }

//   return email.substring(0, atIndex);
// }
