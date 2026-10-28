import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products, orders, orderItems, transactions } from '$lib/server/db/schema';
import { lte, eq, sql, and } from 'drizzle-orm';

/**
 * "Delivered today", in Addis Ababa time.
 *
 * Keyed on `deliveredAt`, not `createdAt`: an order placed yesterday and delivered
 * today belongs on today's card. Both sides are shifted from the database
 * session's timezone to UTC+3, so the day doesn't roll over at 03:00 local time
 * when the database runs in UTC.
 */
const deliveredToday = and(
	eq(orders.status, 'delivered'),
	sql`DATE(CONVERT_TZ(${orders.deliveredAt}, @@session.time_zone, '+03:00')) = DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+03:00'))`
);

export const load: PageServerLoad = async () => {
	const reorderProducts = await db
		.select({
			name: products.name,
			quantity: products.quantity
		})
		.from(products)
		.where(and(eq(products.isActive, true), lte(products.quantity, products.reorderLevel)));

	const itemStats = await db
		.select({
			totalOrders: sql<number>`count(distinct ${orders.id})`.mapWith(Number),
			totalItemsSold: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.mapWith(Number),
			totalRevenue:
				sql<number>`coalesce(sum(${orderItems.price} * ${orderItems.quantity}), 0)`.mapWith(Number)
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.where(deliveredToday)
		.then((rows) => rows[0]);

	// A separate query: joining `orderItems` above fans each order out into one row
	// per line item, and summing the order-level payment across those rows counted
	// every payment once per item.
	const paymentStats = await db
		.select({
			totalPaymentsCollected: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number)
		})
		.from(orders)
		.innerJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(
			and(
				deliveredToday,
				sql`${transactions.paymentStatus} in ('paid', 'partially_paid', 'overpaid')`
			)
		)
		.then((rows) => rows[0]);

	const dailyStats = {
		...itemStats,
		averageOrderValue: itemStats.totalOrders ? itemStats.totalRevenue / itemStats.totalOrders : 0,
		totalPaymentsCollected: paymentStats.totalPaymentsCollected
	};

	return {
		reorderProducts,
		dailyStats
	};
};
