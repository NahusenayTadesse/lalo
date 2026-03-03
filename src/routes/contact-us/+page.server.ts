import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql } from 'drizzle-orm';

import { addUser, loginSchema } from '$lib/ZodSchema';
import { contactSchema } from './schema';
import { db } from '$lib/server/db';
import { orders, orderItems, products, customers } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(contactSchema));
	const signupForm = await superValidate(zod4(addUser));
	const loginForm = await superValidate(zod4(loginSchema));

	const fetchedProducts = await db
		.select({
			value: products.id,
			name: sql<string>`
TRIM(
  CONCAT(
    ${products.name},
    COALESCE(CONCAT(' ', ${products.price}, ' ETB'), ''),
    COALESCE(CONCAT(' ', ${products.quantity}, ' Left'), '')
  )
)`,

			price: products.price
		})
		.from(products);

	const fetchedCustomers = await db
		.select({
			value: customers.id,
			name: customers.name
		})
		.from(customers);

	return {
		form,
		signupForm,
		loginForm,
		fetchedProducts,
		fetchedCustomers
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { selectedProducts } = form.data;

		try {
			await db.transaction(async (tx) => {
				const fetchedProducts = await tx // ← tx, not db
					.select({ value: products.id, price: products.price })
					.from(products);

				const customer = await tx
					.select({ value: customers.id })
					.from(customers)
					.where(eq(customers.userId, locals?.user?.id))
					.then((rows) => rows[0]);

				const [orderId] = await tx
					.insert(orders)
					.values({ customerId: customer.value, status: 'pending' })
					.$returningId();

				if (selectedProducts.length) {
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: orderId.id,
							productId: Number(product.product),
							quantity: Number(product.quantity),
							price: getPrice(fetchedProducts, Number(product.product)),
							createdBy: locals?.user?.id
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Order Successfully Added' });
		} catch (err) {
			return message(form, {
				type: 'error',
				text: 'Error Adding Orders: ' + err?.message
			});
		}
	}
};

function getPrice(list: Array<{ value: number; price: string }>, value: number): number {
	const item = list.find((i) => i.value === value);
	return item ? Number(item.price) : 0;
}
