import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { orders, orderItems, products, customers } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

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

	const allData = await db
		.select({
			id: orders.id,
			name: customers.name,
			customerId: customers.id,
			status: orders.status
		})
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(eq(orders.status, 'delivered'));

	const allItems = await db
		.select({
			id: orderItems.id,
			orderId: orderItems.orderId,
			product: products.name,
			quantity: orderItems.quantity,
			productId: orderItems.productId,
			price: orderItems.price,
			total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number)
		})
		.from(orderItems)
		.leftJoin(orders, and(eq(orders.id, orderItems.orderId), eq(orders.status, 'pending')))
		.leftJoin(products, eq(orderItems.productId, products.id));

	return {
		form,
		editForm,
		allData,
		allItems,
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

		const { selectedProducts, customer, status } = form.data;

		try {
			await db.transaction(async (tx) => {
				const fetchedProducts = await tx // ← tx, not db
					.select({ value: products.id, price: products.price })
					.from(products);

				const [orderId] = await tx
					.insert(orders)
					.values({ customerId: customer, status })
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
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { id, selectedProducts, customer, status } = form.data;

		try {
			await db.transaction(async (tx) => {
				const fetchedProducts = await tx // ← tx, not db
					.select({ value: products.id, price: products.price })
					.from(products);

				await tx
					.update(orders)
					.set({ customerId: customer, status })
					.where(eq(orders.id, Number(id)));

				if (selectedProducts.length) {
					await tx.delete(orderItems).where(eq(orderItems.orderId, Number(id)));
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: Number(id),
							productId: Number(product.product),
							quantity: Number(product.quantity),
							price: getPrice(fetchedProducts, Number(product.product))
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Order Successfully Updated' });
		} catch (err) {
			return message(form, {
				type: 'error',
				text: 'Error Updating Orders: ' + err?.message
			});
		}
	}
};

function getPrice(list: Array<{ value: number; price: string }>, value: number): number {
	const item = list.find((i) => i.value === value);
	return item ? Number(item.price) : 0;
}
