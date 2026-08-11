import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { customers, user, orders } from '$lib/server/db/schema';
import { eq, and, count, sql, ne } from 'drizzle-orm';
import { setFlash } from 'sveltekit-flash-message/server';
import { fail, message, setError, superValidate } from 'sveltekit-superforms';
import { addCustomer } from '$lib/ZodSchema';
import { duplicateField } from '$lib/server/crud';
import { zod4 } from 'sveltekit-superforms/adapters';

export const load: PageServerLoad = async ({ locals }) => {
	const addCustomerForm = await superValidate(zod4(addCustomer), { id: 'addCustomer' });
	const customersList = await db
		.select({
			id: customers.id,
			customerName: customers.name,
			email: customers.email,
			phone: customers.phone,
			address: customers.address,
			deliveryAddress: customers.deliveryAddress,
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
		customersList,
		addCustomerForm
	};
};

export const actions: Actions = {
	/**
	 * Shared by every page showing the add-customer dialog (customers, orders, …):
	 * they post here with `action="/dashboard/customers?/addCustomer"` rather than
	 * duplicating the action.
	 *
	 * The customer is deliberately standalone — no `user` account is created or
	 * linked, so `userId` is never written here.
	 */
	addCustomer: async ({ request, locals, cookies }) => {
		const form = await superValidate(request, zod4(addCustomer));

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form.' }, cookies);
			return fail(400, { form });
		}
		const { name, email, phone, address, deliveryAddress } = form.data;

		try {
			// BLOCKED: `customers.user_id` and `customers.email` are both still NOT NULL
			// in the DB, so this insert won't type-check or run until those two columns
			// are made nullable. Nothing here changes once they are — the customer stays
			// account-less and email-less by design.
			//
			// `email` must go in as NULL, never '': the column is UNIQUE, and MySQL
			// allows repeated NULLs but not a second empty string.
			await db.insert(customers).values({
				name,
				email: email || null,
				phone,
				address: address || null,
				deliveryAddress: deliveryAddress || null,
				createdBy: locals?.user?.id
			});

			return message(form, { type: 'success', text: 'Customer Successfully Added' });
		} catch (err) {
			console.error('Error adding customer:', err);

			const field = duplicateField(err, customers);
			if (field === 'email' || field === 'phone') {
				return setError(form, field, `That ${field} is already taken.`);
			}

			return message(
				form,
				{ type: 'error', text: 'Error: Something Went Wrong Try Again' },
				{ status: 400 }
			);
		}
	}
};
