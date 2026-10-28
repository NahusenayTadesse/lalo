import { db } from '$lib/server/db';
import { orders, customers, products, orderItems } from '$lib/server/db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(303, '/');

	try {
		const customer = await db
			.select({
				id: customers.id,
				customerName: customers.name
			})
			.from(customers)
			.where(eq(customers.userId, locals.user.id))
			.then((rows) => rows[0]);

		const orderCounts = await db
			.select({
				status: orders.status,
				count: sql<number>`count(${orders.id})`.mapWith(Number)
			})
			.from(orders)
			.where(eq(orders.customerId, Number(customer.id)))
			.groupBy(orders.status);

		const allData = await db
			.select({
				id: orders.id,
				name: customers.name,
				status: orders.status,
				createdAt: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d')`
			})
			.from(orders)
			.leftJoin(customers, eq(orders.customerId, customers.id))
			.where(eq(orders.customerId, Number(customer.id)));

		// Scoped to this customer's own *pending* orders — the page lists these under
		// "Pending Order Breakdown". Constraining the *join* (the original approach)
		// filters nothing — a LEFT JOIN keeps every `orderItems` row — which sent the
		// entire order-items table to every signed-in customer.
		const orderIds = allData.filter((order) => order.status === 'pending').map((order) => order.id);
		const allItems = orderIds.length
			? await db
					.select({
						id: orderItems.id,
						orderId: orderItems.orderId,
						product: products.name,
						quantity: orderItems.quantity,
						productId: orderItems.productId,
						// A decimal comes back from mysql2 as a string; the page calls `.toFixed`
						// on it, which threw and took the whole page down.
						price: sql<number>`${orderItems.price}`.mapWith(Number),
						total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number)
					})
					.from(orderItems)
					.leftJoin(products, eq(orderItems.productId, products.id))
					.where(inArray(orderItems.orderId, orderIds))
			: [];

		return {
			customer,
			allData,
			allItems,
			orderCounts
		};
	} catch (error) {
		console.error('Error loading customer dashboard:', error);
		return {
			customer: null,
			form: null,
			reciepts: [],
			error: 'Failed to load customer dashboard.'
		};
	}
};
