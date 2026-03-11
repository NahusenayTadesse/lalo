import { superValidate, message, setError } from 'sveltekit-superforms';
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
	transactions
} from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';
import { saveUploadedFile } from '$lib/server/upload';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

	const fetchedProducts = await db
		.select({
			value: products.id,
			name: products.name
		})
		.from(products);

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
		fetchedPrices
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { selectedProducts, customer, status } = form.data;

		try {
			await db.transaction(async (tx) => {
				const [orderId] = await tx
					.insert(orders)
					.values({ customerId: customer, status })
					.$returningId();

				if (selectedProducts.length) {
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: orderId.id,
							productId: Number(product.product),
							amount: splitNumbers(product.amount).amount,
							quantity: Number(product.quantity),
							price: splitNumbers(product.amount).price,
							createdBy: locals?.user?.id
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Order Successfully Added' });
		} catch (err) {
			return message(form, {
				type: 'error',
				text: 'Error Adding Orders: ' + err?.message
			});
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { id, selectedProducts, customer, status, reciept, paymentMethod } = form.data;

		try {
			await db.transaction(async (tx) => {
				if (status === 'delivered' && !paymentMethod) {
					setError(form, 'paymentMethod', 'Payment Method Error is required for Delivered Orders');
					return message(
						form,
						{ type: 'error', text: 'Payment Method Error is required for Delivered Orders' },
						{
							status: 500
						}
					);
				}

				let transactionId: number;

				if (reciept) {
					const recieptLink = await saveUploadedFile(reciept);

					const existingTransaction = await db
						.select({
							transactionId: orders.transactionId
						})
						.from(orders)
						.where(eq(orders.id, id))
						.then((rows) => rows[0]);

					if (existingTransaction.transactionId) {
						await db.update(transactions).set({
							paymentMethodId: paymentMethod,
							amount: String(calculateTotalAmount(selectedProducts)),
							recieptLink,
							updatedBy: locals?.user?.id
						});

						await tx
							.update(orders)
							.set({ customerId: customer, status, updatedBy: locals?.user?.id })
							.where(eq(orders.id, Number(id)));
					} else {
						const [tranId] = await db
							.insert(transactions)
							.values({
								paymentMethodId: paymentMethod,
								amount: calculateTotalAmount(selectedProducts),
								recieptLink,
								createdBy: locals?.user?.id
							})
							.$returningId();
						transactionId = tranId.id;

						await tx
							.update(orders)
							.set({ customerId: customer, status, transactionId })
							.where(eq(orders.id, Number(id)));
					}
				}

				if (selectedProducts.length) {
					await tx.delete(orderItems).where(eq(orderItems.orderId, Number(id)));
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: Number(id),
							productId: Number(product.product),
							amount: splitNumbers(product.amount).amount,
							quantity: Number(product.quantity),
							price: splitNumbers(product.amount).price
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Order Successfully Updated' });
		} catch (err) {
			console.error(err?.message);
			return message(form, {
				type: 'error',
				text: 'Error Updating Orders: ' + err?.message
			});
		}
	}
};

function getPrice(list: Array<{ value: number; price: string }>, value: number): number {
	const item = list.find((i) => i.value === value);
	return item ? Number(item.price) : 0;
}
function splitNumbers(input: string) {
	const [first, second] = input.split(' ');
	return {
		price: Number(first),
		amount: Number(second)
	};
}

const calculateTotalAmount = (
	products: Array<{ amount: number; price: number; quantity: number }>
) => {
	return products.reduce((total, item) => {
		// Convert string amount to number before adding
		const price = parseFloat(item.amount) || 0;
		return total + price * item.quantity;
	}, 0);
};
