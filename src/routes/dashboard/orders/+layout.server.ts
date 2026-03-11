import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql, min } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import {
	orders,
	orderItems,
	products,
	customers,
	prices,
	paymentMethods
} from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

	const fetchedProducts = await db
		.select({
			value: products.id,
			name: products.name
		})
		.from(products);

	const paymentMethodList = await db
		.select({
			value: paymentMethods.id,
			name: paymentMethods.name
		})
		.from(paymentMethods);

	const fetchedPrices = await db
		.select({
			value: sql<string>`CONCAT(${prices.price}, ' ', ${prices.amount})`,
			name: sql<string>`CONCAT(${prices.price}, ' ', ${prices.amount}, ' pieces')`,
			productId: prices.productId,
			price: prices.price,
			amount: prices.amount
		})
		.from(prices);

	const fetchedCustomers = await db
		.select({
			value: customers.id,
			name: sql<string>`CONCAT(${customers.name}, ' ', ${customers.phone})`
		})
		.from(customers);

	const allData = await db
		.select({
			id: orders.id,
			name: customers.name,
			customerId: customers.id,
			phone: customers.phone,
			status: orders.status
		})
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(eq(orders.status, 'pending'));

	const allItems = await db
		.select({
			id: orderItems.id,
			orderId: orderItems.orderId,
			product: products.name,
			amount: orderItems.amount,
			quantity: orderItems.quantity,
			productId: orderItems.productId,
			price: orderItems.price,
			total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number)
		})
		.from(orderItems)
		.leftJoin(orders, and(eq(orders.id, orderItems.orderId), eq(orders.status, 'pending')))
		.leftJoin(products, eq(orderItems.productId, products.id));

	return {
		form,
		editForm,
		allData,
		allItems,
		fetchedProducts,
		fetchedCustomers,
		fetchedPrices,
		paymentMethodList
	};
};
