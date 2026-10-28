import { db } from '$lib/server/db';
import { orders, customers, products, orderItems } from '$lib/server/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { error, isHttpError } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Read-only. This route used to carry copies of an `editCustomer` action (writing
// `firstName`/`lastName`/`gender` columns `customers` doesn't have) and of the
// `delete` action; the page used neither. Editing and deleting live on
// `customers/[id]`.
export const load: PageServerLoad = async ({ params }) => {
	try {
		const id = Number(params.id);

		const customer = await db
			.select({ customerName: customers.name })
			.from(customers)
			.where(eq(customers.id, id))
			.then((rows) => rows[0]);

		if (!customer) error(404, 'Customer not found');

		const allData = await db
			.select({
				id: orders.id,
				name: customers.name,
				status: orders.status,
				createdAt: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d')`
			})
			.from(orders)
			.leftJoin(customers, eq(orders.customerId, customers.id))
			.where(eq(orders.customerId, id));

		// Only this customer's items — a condition inside a LEFT JOIN filters nothing.
		const orderIds = allData.map((order) => order.id);
		const allItems = orderIds.length
			? await db
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
					.leftJoin(products, eq(orderItems.productId, products.id))
					.where(inArray(orderItems.orderId, orderIds))
			: [];

		return { customer, allData, allItems };
	} catch (err) {
		if (isHttpError(err)) throw err;
		console.error('Error loading customer order history:', err);
		return { customer: null, allData: [], allItems: [], error: 'Failed to load order history.' };
	}
};
