import type { Actions, PageServerLoad } from './$types';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { add } from './schema';
import { auth } from '$lib/server/auth';
import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
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
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		const { name, password, role } = form.data;
		const email = form.data.email.toLowerCase();

		// The posted id is only a number from a <select>; make sure it is a real role
		// before it decides what the new account can reach.
		const selectedRole = await db
			.select({ id: roles.id })
			.from(roles)
			.where(eq(roles.id, role))
			.then((rows) => rows[0]);

		if (!selectedRole) {
			setError(form, 'role', 'Please choose a valid role');
			return message(form, { type: 'error', text: 'Please choose a valid role' }, { status: 400 });
		}

		// `auth.api.createUser` belongs to better-auth's `admin` plugin, which this app
		// doesn't install — calling it threw on every attempt. `signUpEmail` isn't a
		// substitute either: it signs the new account in and the SvelteKit cookie plugin
		// would hand that session to the admin. So the account is created the way the
		// admin plugin does it, through better-auth's own adapter and password hasher.
		const ctx = await auth.$context;

		if (await ctx.internalAdapter.findUserByEmail(email)) {
			setError(form, 'email', 'A user with this email already exists');
			return message(
				form,
				{ type: 'error', text: 'A user with this email already exists' },
				{ status: 400 }
			);
		}

		let createdId: string | undefined;

		try {
			const created = await ctx.internalAdapter.createUser({ email, name, emailVerified: false });
			createdId = created.id;

			await ctx.internalAdapter.linkAccount({
				accountId: created.id,
				providerId: 'credential',
				password: await ctx.password.hash(password),
				userId: created.id
			});

			await db.update(user).set({ roleId: selectedRole.id }).where(eq(user.id, created.id));

			return message(form, { type: 'success', text: 'User added successfully' });
		} catch (error) {
			console.error('Add user failed:', error);

			// Better-auth's writes can't join a drizzle transaction, so undo by hand:
			// otherwise a half-created user keeps the email and blocks every retry.
			if (createdId) {
				await ctx.internalAdapter
					.deleteUser(createdId)
					.catch((err) => console.error('Add user: cleanup failed:', err));
			}

			return message(form, { type: 'error', text: 'Could not add the user' }, { status: 500 });
		}
	}
};
