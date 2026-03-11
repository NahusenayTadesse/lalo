import { eq, and, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import {
	orders,
	orderItems,
	products,
	customers,
	transactions,
	paymentMethods
} from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allData = await db
		.select({
			id: orders.id,
			name: customers.name,
			customerId: customers.id,
			phone: customers.phone,
			paymentMethod: transactions.paymentMethodId,
			paymentMethodName: paymentMethods.name,
			status: orders.status,
			recieptLink: transactions.recieptLink
		})
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(paymentMethods, eq(transactions.paymentMethodId, paymentMethods.id))
		.where(eq(orders.status, 'delivered'));

	const allItems = await db
		.select({
			id: orderItems.id,
			orderId: orderItems.orderId,
			product: products.name,
			quantity: orderItems.quantity,
			amount: orderItems.amount,
			productId: orderItems.productId,
			price: orderItems.price,
			total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number)
		})
		.from(orderItems)
		.leftJoin(orders, and(eq(orders.id, orderItems.orderId), eq(orders.status, 'pending')))
		.leftJoin(products, eq(orderItems.productId, products.id));

	return {
		allData,
		allItems
	};
};
