import { auth } from '$lib/server/auth';
import type { Actions } from './$types';

import { error, redirect } from '@sveltejs/kit';
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
import { eq, sql, desc, sum } from 'drizzle-orm';

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

		// 2. Financial Aggregations (Paid vs Unpaid/Pending)
		const financialStats = await db
			.select({
				status: transactions.paymentStatus,
				totalAmount: sum(transactions.amount).mapWith(Number)
			})
			.from(orders)
			.innerJoin(transactions, eq(orders.transactionId, transactions.id))
			.where(eq(orders.customerId, customer.id))
			.groupBy(transactions.paymentStatus);

		// Calculate client-side totals out of database groupings
		let totalSpent = 0;
		let totalOutstanding = 0;

		financialStats.forEach((stat) => {
			if (stat.status === 'paid') {
				totalSpent += stat.totalAmount;
			} else if (['pending', 'unpaid', 'disputed'].includes(stat.status ?? '')) {
				totalOutstanding += stat.totalAmount;
			}
		});

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
		const rawRecentActivity = await db
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
			.where(eq(orders.customerId, customer.id))
			.orderBy(desc(orders.id))
			.limit(15); // Adjust based on maximum items limit

		// Structure flat rows down to single orders containing item records
		const activityMap = rawRecentActivity.reduce(
			(acc, row) => {
				if (!acc[row.orderId]) {
					acc[row.orderId] = {
						id: row.orderId,
						status: row.orderStatus,
						amount: Number(row.amount || 0),
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

export const actions: Actions = {
	logout: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		redirect('/login', { type: 'success', message: 'Logout Successful' }, event.cookies);
	}
};
