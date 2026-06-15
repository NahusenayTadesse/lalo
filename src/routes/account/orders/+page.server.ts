import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { orders, customers, orderItems, products } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// 1. Guard check
	if (!locals.user) return redirect(303, '/');

	try {
		// 2. Fetch the logged-in customer's ID
		const customer = await db
			.select({ id: customers.id })
			.from(customers)
			.where(eq(customers.userId, locals.user.id))
			.then((rows) => rows[0]);

		if (!customer) {
			throw error(404, 'Customer profile not found.');
		}

		// 3. Fetch ONLY pending orders along with an aggregated array of items
		// Using a subquery or structured map to prevent item array layout fragmentation
		const rawPendingOrders = await db
			.select({
				id: orders.id,
				status: orders.status,
				createdAt: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d %H:%i')`,
				updatedAt: sql<string>`DATE_FORMAT(${orders.updatedAt}, '%Y-%m-%d %H:%i')`,
				// Example tracking steps field if you have it, otherwise mock calculated on frontend
				itemId: orderItems.id,
				productName: products.name,
				quantity: orderItems.quantity,
				price: orderItems.price,
				total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number)
			})
			.from(orders)
			.leftJoin(orderItems, eq(orders.id, orderItems.orderId))
			.leftJoin(products, eq(orderItems.productId, products.id))
			.where(and(eq(orders.customerId, Number(customer.id)), eq(orders.status, 'pending')));

		// 4. Reduce flat rows into structured Order objects with child Items
		const pendingOrdersMap = rawPendingOrders.reduce(
			(acc, row) => {
				if (!acc[row.id]) {
					acc[row.id] = {
						id: row.id,
						status: row.status,
						createdAt: row.createdAt,
						updatedAt: row.updatedAt,
						currentStep: row.currentStep, // 1: Order Placed, 2: Processing, 3: In Transit
						orderTotal: 0,
						items: []
					};
				}

				if (row.itemId) {
					acc[row.id].items.push({
						id: row.itemId,
						productName: row.productName,
						quantity: row.quantity,
						price: row.price,
						total: row.total
					});
					acc[row.id].orderTotal += row.total;
				}

				return acc;
			},
			{} as Record<number, any>
		);

		return {
			pendingOrders: Object.values(pendingOrdersMap)
		};
	} catch (err) {
		console.error('Error loading order tracking snapshot:', err);
		return {
			pendingOrders: [],
			error: 'Could not populate active tracking parameters.'
		};
	}
};
