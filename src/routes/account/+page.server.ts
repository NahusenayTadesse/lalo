import { error, isHttpError, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	customers,
	orders,
	transactions,
	orderItems,
	products,
	discounts
} from '$lib/server/db/schema';
import { eq, sql, desc, inArray } from 'drizzle-orm';

/** Payment states in which money has actually been received. */
const RECEIVED = ['paid', 'partially_paid', 'overpaid'];

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(303, '/');

	try {
		// 1. Resolve Customer ID
		const customer = await db
			.select({ id: customers.id, name: customers.name })
			.from(customers)
			.where(eq(customers.userId, locals.user.id))
			.then((rows) => rows[0]);

		if (!customer) throw error(404, 'Customer profile not found.');

		// 2. Money, per order.
		// These figures used to come from `transactions` alone, but a transaction only
		// exists once staff record a payment — checkout never creates one. So every
		// unpaid order showed ETB 0.00, "Outstanding Dues" left unpaid orders out, and
		// a cancelled order with a leftover pending transaction was counted as owed.
		// An order's value is its items plus its delivery fee.
		const orderMoney = await db
			.select({
				id: orders.id,
				status: orders.status,
				fee: orders.fee,
				paidAmount: transactions.amount,
				paymentStatus: transactions.paymentStatus,
				itemsTotal: sql<number>`COALESCE((
					SELECT SUM(oi.quantity * oi.price) FROM order_items AS oi WHERE oi.order_id = ${orders.id}
				), 0)`.mapWith(Number)
			})
			.from(orders)
			.leftJoin(transactions, eq(orders.transactionId, transactions.id))
			.where(eq(orders.customerId, customer.id));

		const valueOf = (o: (typeof orderMoney)[number]) => o.itemsTotal + Number(o.fee ?? 0);
		const received = (o: (typeof orderMoney)[number]) =>
			RECEIVED.includes(o.paymentStatus ?? '') ? Number(o.paidAmount ?? 0) : 0;

		let totalSpent = 0;
		let totalOutstanding = 0;

		for (const o of orderMoney) {
			totalSpent += received(o);
			// Only live orders can be owed; a cancelled order never will be.
			if (o.status === 'pending' || o.status === 'delivered') {
				totalOutstanding += Math.max(0, valueOf(o) - received(o));
			}
		}

		const moneyById = new Map(orderMoney.map((o) => [o.id, o]));

		// 3. Simple Order Count Metrics
		const orderCounts = await db
			.select({
				status: orders.status,
				count: sql<number>`count(${orders.id})`.mapWith(Number)
			})
			.from(orders)
			.where(eq(orders.customerId, customer.id))
			.groupBy(orders.status);

		// 4. Detailed Order Timeline Stream (Last 5 orders with items)
		// The limit is applied to orders first. Limiting the flattened order×item rows
		// (the old `.limit(15)`) cut an order with many lines off part-way.
		const recentOrderIds = await db
			.select({ id: orders.id })
			.from(orders)
			.where(eq(orders.customerId, customer.id))
			.orderBy(desc(orders.id))
			.limit(5)
			.then((rows) => rows.map((row) => row.id));

		const rawRecentActivity = recentOrderIds.length
			? await db
					.select({
						orderId: orders.id,
						orderStatus: orders.status,
						amount: transactions.amount,
						paymentStatus: transactions.paymentStatus,
						receiptLink: transactions.recieptLink,
						productName: products.name,
						quantity: orderItems.quantity,
						price: orderItems.price
					})
					.from(orders)
					.leftJoin(transactions, eq(orders.transactionId, transactions.id))
					.leftJoin(orderItems, eq(orders.id, orderItems.orderId))
					.leftJoin(products, eq(orderItems.productId, products.id))
					.where(inArray(orders.id, recentOrderIds))
					.orderBy(desc(orders.id))
			: [];

		// Structure flat rows down to single orders containing item records
		const activityMap = rawRecentActivity.reduce(
			(acc, row) => {
				if (!acc[row.orderId]) {
					acc[row.orderId] = {
						id: row.orderId,
						status: row.orderStatus,
						// What was paid once a payment is recorded; until then, what the order
						// is worth.
						amount: (() => {
							const money = moneyById.get(row.orderId);
							if (!money) return Number(row.amount || 0);
							return received(money) || valueOf(money);
						})(),
						paymentStatus: row.paymentStatus || 'pending',
						receiptLink: row.receiptLink,
						items: []
					};
				}
				if (row.productName) {
					acc[row.orderId].items.push({
						name: row.productName,
						qty: row.quantity,
						price: Number(row.price)
					});
				}
				return acc;
			},
			{} as Record<number, any>
		);

		// 5. Available Offers / Discount Campaigns for the customer
		const activeDiscounts = await db
			.select({
				id: discounts.id,
				name: discounts.name,
				description: discounts.description,
				amount: discounts.amount,
				productName: products.name
			})
			.from(discounts)
			.leftJoin(products, eq(discounts.productId, products.id))
			.where(eq(discounts.isActive, true))
			.limit(3);

		return {
			customer,
			metrics: {
				totalSpent,
				totalOutstanding,
				counts: orderCounts
			},
			recentActivity: Object.values(activityMap),
			activeDiscounts
		};
	} catch (err) {
		// The 404 above used to be swallowed here and rendered as an empty dashboard.
		if (isHttpError(err)) throw err;
		console.error('Main Customer Dashboard error:', err);
		return {
			customer: null,
			metrics: { totalSpent: 0, totalOutstanding: 0, counts: [] },
			recentActivity: [],
			activeDiscounts: [],
			error: 'Failed to balance metrics summary snapshot.'
		};
	}
};
