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
import { eq, sql, and, gt, gte, lt, lte, asc, isNotNull, type SQL } from 'drizzle-orm';
import { setFlash } from 'sveltekit-flash-message/server';
import { EXPIRY_WARNING_DAYS, today } from '$lib/expiry';
import { StockError, writeOffExpired } from '$lib/server/inventory';
import type { Actions } from './$types';

/** `YYYY-MM-DD`, `days` after `from`. */
const addDays = (from: string, days: number) =>
	new Date(Date.parse(from) + days * 86_400_000).toISOString().slice(0, 10);

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
	const now = today();

	// Per variant: one package selling out is a reorder even while another has
	// plenty. A variant with no level of its own uses the product's; 0 means
	// "don't alert". Expired units don't count: they can't be sold.
	const reorderLevel = sql`COALESCE(${prices.reorderLevel}, ${products.reorderLevel}, 0)`;
	const sellable = sql<number>`${prices.quantity} - (SELECT COALESCE(SUM(b.quantity_remaining), 0) FROM stock_batches b WHERE b.variant_id = ${prices.id} AND b.expires_at < ${now})`;
	const reorderProducts = await db
		.select({
			name: sql<string>`CONCAT(${products.name}, ' — ', ${prices.amount})`,
			quantity: sellable.mapWith(Number),
			detail: sql<string>`CONCAT('Qty: ', ${sellable}, ' (reorder at ', ${reorderLevel}, ')')`,
			href: sql<string>`CONCAT('/dashboard/products/single/', ${products.id})`
		})
		.from(prices)
		.innerJoin(products, eq(products.id, prices.productId))
		.where(
			and(
				eq(products.isActive, true),
				sql`${reorderLevel} > 0`,
				sql`${sellable} <= ${reorderLevel}`
			)
		)
		.orderBy(asc(sellable));

	// Batches still holding stock, by expiry: already expired (to write off), and
	// expiring within the warning window (to sell first).
	const batchesExpiring = (detail: string, ...range: SQL[]) =>
		db
			.select({
				name: sql<string>`CONCAT(${products.name}, ' — ', ${prices.amount}, ' · ', ${stockBatches.batchNumber})`,
				quantity: stockBatches.quantityRemaining,
				detail: sql<string>`CONCAT(${stockBatches.quantityRemaining}, ${detail}, DATE_FORMAT(${stockBatches.expiresAt}, '%Y-%m-%d'))`,
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
					...range
				)
			)
			.orderBy(asc(stockBatches.expiresAt));

	const expiredBatches = await batchesExpiring(
		' left · expired ',
		lt(stockBatches.expiresAt, now)
	);
	const expiringBatches = await batchesExpiring(
		' left · expires ',
		gte(stockBatches.expiresAt, now),
		lte(stockBatches.expiresAt, addDays(now, EXPIRY_WARNING_DAYS))
	);

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
		expiredBatches,
		expiringBatches,
		dailyStats
	};
};

export const actions: Actions = {
	/** Every expired batch, of every product, that still holds stock goes out as damage. */
	writeOffExpired: async ({ locals, cookies }) => {
		try {
			const written = await db.transaction((tx) =>
				writeOffExpired(tx, { by: locals.user?.name ?? 'Staff' }, locals.user?.id)
			);
			const units = written.reduce((sum, b) => sum + b.quantity, 0);
			setFlash(
				{
					type: 'success',
					message: units
						? `Wrote off ${units} expired unit${units === 1 ? '' : 's'} from ${written.length} batch${written.length === 1 ? '' : 'es'}`
						: 'Nothing has expired'
				},
				cookies
			);
		} catch (err) {
			if (!(err instanceof StockError)) console.error('Expired write-off failed:', err);
			setFlash(
				{
					type: 'error',
					message: err instanceof StockError ? err.message : 'Could not write off the expired stock'
				},
				cookies
			);
		}
	}
};
