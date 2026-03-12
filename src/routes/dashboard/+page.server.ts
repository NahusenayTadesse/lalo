import { auth } from '$lib/server/auth';
import { redirect } from 'sveltekit-flash-message/server';

import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products, orders, orderItems, transactions } from '$lib/server/db/schema';
import { lte, eq, gte, sql, and } from 'drizzle-orm';
export const load: PageServerLoad = async () => {
	const reorderProducts = await db
		.select({
			name: products.name,
			quantity: products.quantity
		})
		.from(products)
		.where(lte(products.quantity, products.reorderLevel));

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const dailyStats = await db
		.select({
			totalOrders: sql<number>`count(distinct ${orders.id})`,
			totalItemsSold: sql<number>`cast(sum(${orderItems.quantity}) as unsigned)`,
			totalRevenue: sql<number>`sum(${orderItems.price} * ${orderItems.quantity})`,
			averageOrderValue: sql<number>`sum(${orderItems.price} * ${orderItems.quantity}) / count(distinct ${orders.id})`,
			totalPaymentsCollected: sql<number>`sum(case when ${transactions.paymentStatus} = 'paid' then ${transactions.amount} else 0 end)`
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(
			and(
				eq(orders.status, 'delivered'),
				gte(orders.createdAt, today) // Assuming createdAt exists in ...secureFields
			)
		);

	return {
		reorderProducts,
		dailyStats
	};
};

export const actions: Actions = {
	logout: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		redirect('/login', { type: 'success', message: 'Logout Successful' }, event.cookies);
	}
};
