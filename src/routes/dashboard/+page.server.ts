import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	products,
	orders,
	orderItems,
	transactions,
	prices,
	stockBatches
} from '$lib/server/db/schema';
import { eq, sql, and, gt, asc, isNotNull } from 'drizzle-orm';

/** How far ahead a batch's expiry shows on the dashboard. */
const EXPIRY_WINDOW_DAYS = 7;

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
	// Per variant: one package selling out is a reorder even while another has
	// plenty. A variant with no level of its own uses the product's; 0 means
	// "don't alert".
	const reorderLevel = sql`COALESCE(${prices.reorderLevel}, ${products.reorderLevel}, 0)`;
	const reorderProducts = await db
		.select({
			name: sql<string>`CONCAT(${products.name}, ' — ', ${prices.amount})`,
			quantity: prices.quantity,
			detail: sql<string>`CONCAT('Qty: ', ${prices.quantity}, ' (reorder at ', ${reorderLevel}, ')')`,
			href: sql<string>`CONCAT('/dashboard/products/single/', ${products.id})`
		})
		.from(prices)
		.innerJoin(products, eq(products.id, prices.productId))
		.where(
			and(
				eq(products.isActive, true),
				sql`${reorderLevel} > 0`,
				sql`${prices.quantity} <= ${reorderLevel}`
			)
		)
		.orderBy(asc(prices.quantity));

	// Batches still holding stock that expire within the window, or already have.
	const expiringBatches = await db
		.select({
			name: sql<string>`CONCAT(${products.name}, ' — ', ${prices.amount}, ' · ', ${stockBatches.batchNumber})`,
			quantity: stockBatches.quantityRemaining,
			detail: sql<string>`CONCAT(${stockBatches.quantityRemaining}, ' left · expires ', DATE_FORMAT(${stockBatches.expiresAt}, '%Y-%m-%d'))`,
			href: sql<string>`CONCAT('/dashboard/products/single/', ${products.id})`
		})
		.from(stockBatches)
		.innerJoin(prices, eq(prices.id, stockBatches.variantId))
		.innerJoin(products, eq(products.id, prices.productId))
		.where(
			and(
				eq(products.isActive, true),
				gt(stockBatches.quantityRemaining, 0),
				isNotNull(stockBatches.expiresAt),
				sql`${stockBatches.expiresAt} <= DATE_ADD(DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+03:00')), INTERVAL ${EXPIRY_WINDOW_DAYS} DAY)`
			)
		)
		.orderBy(asc(stockBatches.expiresAt));

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
		expiringBatches,
		dailyStats
	};
};
