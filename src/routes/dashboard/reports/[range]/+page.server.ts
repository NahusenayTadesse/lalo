import { db } from '$lib/server/db';
import { orders, products, orderItems, transactions } from '$lib/server/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';

import { currentMonthFilter } from '$lib/global.svelte';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { range } = params as { range: string };

	const [y1, m1, d1, y2, m2, d2] = range.split('-');

	const start = `${y1}-${m1}-${d1}`;
	const end = `${y2}-${m2}-${d2}`;

	const allReports = await db
		.select({
			orderId: orders.id,
			status: orders.status,
			productName: products.name,
			productId: products.id,
			quantityPurchased: orderItems.quantity,
			unitPrice: orderItems.price,
			lineTotal: orderItems.amount, // Based on your schema's 'amount' field
			totalPaid: transactions.amount,
			receipt: transactions.recieptLink
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(currentMonthFilter(orders.createdAt, start, end))
		.orderBy(asc(orders.createdAt));

	return {
		allReports,
		start,
		end
	};
};
