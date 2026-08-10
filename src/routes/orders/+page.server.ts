import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql, or, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { orders, orderItems, products, customers, prices } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

/** The statuses a customer is allowed to see and edit here. */
const EDITABLE_STATUSES = ['pending', 'cancelled'] as const;

/**
 * The signed-in user's own `customers.id`, or `undefined` if they have no profile row.
 *
 * Every read and write on this route is scoped to this value. It is resolved from
 * the session rather than taken from the form, so a customer cannot act on another
 * customer's orders by editing the posted `customer` field.
 */
async function getOwnCustomerId(userId: string): Promise<number | undefined> {
	const row = await db
		.select({ value: customers.id })
		.from(customers)
		.where(eq(customers.userId, userId))
		.limit(1)
		.then((rows) => rows[0]);

	return row?.value;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const [form, editForm] = await Promise.all([superValidate(zod4(add)), superValidate(zod4(edit))]);

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

	const ownCustomerId = await getOwnCustomerId(locals.user.id);

	// Signed in but no customer profile yet — there is nothing of theirs to list, and
	// filtering on an `undefined` id would throw rather than return an empty set.
	if (ownCustomerId === undefined) {
		return {
			form,
			editForm,
			allData: [],
			customerId: undefined,
			allItems: [],
			fetchedProducts,
			fetchedCustomers: [],
			fetchedPrices
		};
	}

	// Only ever the caller's own record: the order form's customer is fixed to them,
	// so shipping the whole customer table here would leak every customer's name.
	const fetchedCustomers = await db
		.select({
			value: customers.id,
			name: customers.name
		})
		.from(customers)
		.where(eq(customers.id, ownCustomerId));

	const allData = await db
		.select({
			id: orders.id,
			name: customers.name,
			customerId: customers.id,
			status: orders.status
		})
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(
			and(
				eq(orders.customerId, ownCustomerId),
				or(eq(orders.status, 'pending'), eq(orders.status, 'cancelled'))
			)
		);

	// Scoped to the orders just returned. Constraining the *join* instead (the previous
	// approach) filters nothing — a LEFT JOIN keeps every `orderItems` row — which sent
	// the entire order-items table to every signed-in customer.
	const orderIds = allData.map((order) => order.id);
	const allItems = orderIds.length
		? await db
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
				.leftJoin(products, eq(orderItems.productId, products.id))
				.where(inArray(orderItems.orderId, orderIds))
		: [];

	return {
		form,
		editForm,
		allData,
		customerId: { value: ownCustomerId },
		allItems,
		fetchedProducts,
		fetchedCustomers,
		fetchedPrices
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));

		// `load` cannot protect this: actions run *before* any load, so the guard above
		// only ever affects the re-render. Each action has to check for itself.
		if (!locals.user) {
			return message(form, { type: 'error', text: 'Please sign in' }, { status: 401 });
		}

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const ownCustomerId = await getOwnCustomerId(locals.user.id);
		if (ownCustomerId === undefined) {
			return message(form, { type: 'error', text: 'No customer profile found' }, { status: 403 });
		}

		const { selectedProducts } = form.data;

		try {
			await db.transaction(async (tx) => {
				const lineItems = await resolveLineItems(tx, selectedProducts);

				// The posted `customer` is ignored — the order belongs to the caller.
				// `status` was previously left null, which meant a new order never matched
				// the pending/cancelled filter in `load` and so never appeared in the list.
				const [orderId] = await tx
					.insert(orders)
					.values({ customerId: ownCustomerId, status: 'pending', createdBy: locals.user?.id })
					.$returningId();

				if (lineItems.length) {
					await tx.insert(orderItems).values(
						lineItems.map((item) => ({
							orderId: orderId.id,
							...item,
							createdBy: locals.user?.id
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Order Successfully Added' });
		} catch (err) {
			console.error('Failed to add order:', err);
			return message(form, { type: 'error', text: 'Could not add the order' }, { status: 500 });
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));

		if (!locals.user) {
			return message(form, { type: 'error', text: 'Please sign in' }, { status: 401 });
		}

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const ownCustomerId = await getOwnCustomerId(locals.user.id);
		if (ownCustomerId === undefined) {
			return message(form, { type: 'error', text: 'No customer profile found' }, { status: 403 });
		}

		const { id, selectedProducts } = form.data;
		const orderId = Number(id);

		try {
			// Ownership is proven up front, so the item delete/insert below cannot touch
			// another customer's order. Restricted to the statuses this page exposes, so a
			// delivered order can't be rewritten after the fact.
			const existing = await db
				.select({ id: orders.id })
				.from(orders)
				.where(
					and(
						eq(orders.id, orderId),
						eq(orders.customerId, ownCustomerId),
						inArray(orders.status, [...EDITABLE_STATUSES])
					)
				)
				.limit(1)
				.then((rows) => rows[0]);

			if (!existing) {
				return message(form, { type: 'error', text: 'Order not found' }, { status: 404 });
			}

			await db.transaction(async (tx) => {
				const lineItems = await resolveLineItems(tx, selectedProducts);

				// `customerId` is deliberately not updated — an order never changes owner.
				await tx.update(orders).set({ updatedBy: locals.user?.id }).where(eq(orders.id, orderId));

				if (lineItems.length) {
					await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
					await tx.insert(orderItems).values(
						lineItems.map((item) => ({
							orderId,
							...item,
							updatedBy: locals.user?.id
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Order Successfully Updated' });
		} catch (err) {
			console.error('Failed to update order:', err);
			return message(form, { type: 'error', text: 'Could not update the order' }, { status: 500 });
		}
	}
};

/**
 * The client picks a variant from `fetchedPrices`, whose `value` is the combined
 * label `"<price> <amount>"` (e.g. `"200.00 50g"`). Only the amount half is
 * meaningful as input — the price half is re-read from the database below, so a
 * tampered label cannot set the price.
 */
function variantLabel(input: string): string {
	const [, ...rest] = input.trim().split(' ');
	return rest.join(' ');
}

/**
 * Turns the posted line items into rows to insert, taking every price from the
 * `prices` table rather than from the request. Throws if a product/variant pair
 * doesn't exist, which rolls the surrounding transaction back.
 */
async function resolveLineItems(
	tx: Pick<typeof db, 'select'>,
	selectedProducts: Array<{ product: number; quantity: number; amount: string }>
) {
	const productIds = [...new Set(selectedProducts.map((p) => Number(p.product)))];

	const variants = await tx
		.select({ productId: prices.productId, amount: prices.amount, price: prices.price })
		.from(prices)
		.where(inArray(prices.productId, productIds));

	return selectedProducts.map((product) => {
		const productId = Number(product.product);
		const amount = variantLabel(product.amount);
		const variant = variants.find((v) => v.productId === productId && v.amount === amount);

		if (!variant) {
			throw new Error(`No price found for product ${productId} (${amount || 'no variant'})`);
		}

		return {
			productId,
			quantity: Number(product.quantity),
			amount: variant.amount,
			// `price` is a decimal column — mysql2 wants a string, and a JS number
			// would silently lose precision.
			price: variant.price
		};
	});
}
