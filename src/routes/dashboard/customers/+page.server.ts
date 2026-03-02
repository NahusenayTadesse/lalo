import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { customers, user, orders } from '$lib/server/db/schema';
import { eq, and, count, sql, ne } from 'drizzle-orm';
import { setFlash } from 'sveltekit-flash-message/server';
import { fail, setError, superValidate } from 'sveltekit-superforms';
import { addCustomer } from '$lib/ZodSchema';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async ({ locals }) => {
	const form = await superValidate(zod4(addCustomer));
	const customersList = await db
		.select({
			id: customers.id,
			customerName: customers.name,
			phone: customers.phone,
			orderCount: count(orders.id),
			daysSinceJoined: sql<number>`DATEDIFF(CURRENT_DATE, ${customers.createdAt})`,
			createdBy: user.name,
			createdById: user.id,
			createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%Y-%m-%d')`
		})
		.from(customers)
		.leftJoin(user, eq(customers.createdBy, user.id))
		.leftJoin(orders, and(eq(orders.customerId, customers.id), eq(orders.status, 'pending')))
		.groupBy(customers.id, user.name, customers.createdAt, customers.name);

	return {
		customersList
	};
};

export const actions: Actions = {
	addCustomer: async ({ request, locals, cookies }) => {
		const form = await superValidate(request, zod4(addCustomer));

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form.' }, cookies);
			return fail(400, { form });
		}
		const { firstName, lastName, gender, phone } = form.data;

		try {
			await db.insert(customers).values({
				name,
				phone,
				createdBy: locals?.user?.id
			});

			// Stay on the same page and set a flash message
			setFlash({ type: 'success', message: 'Customer Successfully Added' }, cookies);
			return {
				form
			};
		} catch (err) {
			console.error('Error' + err);
			setFlash(
				{
					type: 'error',
					message:
						err.code === 'ER_DUP_ENTRY'
							? 'Phone number is already taken. Please choose another one.'
							: err.message
				},
				cookies
			);

			if (err.code === 'ER_DUP_ENTRY')
				return setError(form, 'phone', 'Phone Number already exists.');

			return fail(400, {
				form
			});
		}
	}
};
