import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, or, like, gte, lte, desc, sql, count, inArray } from 'drizzle-orm';
import { sendEmail, customerDeliveredTemplate, adminDeliveredTemplate } from '$lib/server/email';
import { USER } from '$env/static/private';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import {
	orders,
	orderItems,
	products,
	customers,
	prices,
	transactions,
	paymentMethods,
	productAdjustments,
	placeNames,
	freeDelivery
} from '$lib/server/db/schema';
import { resolveDeliveryFee } from '$lib/server/delivery';
import { idSchema, duplicateField } from '$lib/server/crud';
import { addCustomer } from '$lib/ZodSchema';
import { saveUploadedFile } from '$lib/server/upload';
import type { PageServerLoad, Actions } from './$types';

const DEFAULT_PAGE_SIZE = 20;
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];
const STATUSES = ['pending', 'delivered', 'cancelled'] as const;

export const load: PageServerLoad = async ({ url }) => {
	const statusParam = url.searchParams.get('status') ?? 'pending';
	const status = STATUSES.includes(statusParam as (typeof STATUSES)[number]) ? statusParam : 'all';
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');
	const search = url.searchParams.get('search')?.trim() ?? '';
	const paymentMethodFilter = url.searchParams.get('paymentMethod');
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const pageSizeParam = parseInt(url.searchParams.get('pageSize') ?? '');
	const PAGE_SIZE = ALLOWED_PAGE_SIZES.includes(pageSizeParam) ? pageSizeParam : DEFAULT_PAGE_SIZE;
	const offset = (page - 1) * PAGE_SIZE;

	const whereClause = and(
		status !== 'all' ? eq(orders.status, status as (typeof STATUSES)[number]) : undefined,
		start ? gte(orders.createdAt, new Date(start)) : undefined,
		end ? lte(orders.createdAt, new Date(`${end}T23:59:59`)) : undefined,
		paymentMethodFilter ? eq(transactions.paymentMethodId, Number(paymentMethodFilter)) : undefined,
		search
			? or(
					like(customers.name, `%${search}%`),
					like(customers.phone, `%${search}%`),
					like(customers.email, `%${search}%`),
					like(orders.deliveryAddress, `%${search}%`)
				)
			: undefined
	);

	// `addCustomerForm` feeds the shared add-customer dialog; it posts across to
	// /dashboard/customers?/addCustomer, which is where that action lives.
	const [form, editForm, deleteForm, addCustomerForm] = await Promise.all([
		superValidate(zod4(add)),
		superValidate(zod4(edit)),
		superValidate(zod4(idSchema)),
		superValidate(zod4(addCustomer), { id: 'addCustomer' })
	]);

	const fetchedProducts = await db
		.select({ value: products.id, name: products.name })
		.from(products);

	const paymentMethodList = await db
		.select({ value: paymentMethods.id, name: paymentMethods.name })
		.from(paymentMethods);

	// One row per orderable variant. `value` stays the "<price> <label>" string
	// because that is what `selectedProducts[].amount` carries and what
	// splitNumbers() reads back — the picker keys off `id` and writes both fields.
	//
	// innerJoin, not leftJoin: a large share of `prices` rows point at products that
	// no longer exist (the FK evidently didn't cascade), and a variant of a deleted
	// product can't be ordered. The old product-then-package picker hid them by
	// accident; one flat list would have offered them as nameless "100g" rows.
	const fetchedPrices = await db
		.select({
			value: sql<string>`CONCAT(${prices.price}, ' ', ${prices.amount})`,
			name: sql<string>`CONCAT(${prices.price}, ' ', ${prices.amount}, ' pieces')`,
			id: prices.id,
			productId: prices.productId,
			productName: products.name,
			price: prices.price,
			amount: prices.amount
		})
		.from(prices)
		.innerJoin(products, eq(prices.productId, products.id));

	// COALESCE matters: MySQL's CONCAT returns NULL if any argument is NULL, so a
	// customer with no phone used to come back with a null label and show up as a
	// blank row in the picker.
	const fetchedCustomers = await db
		.select({
			value: customers.id,
			name: sql<string>`CONCAT(${customers.name}, ' ', COALESCE(${customers.phone}, ''))`,
			// Carried along so picking a customer can pre-fill the delivery fields.
			address: customers.address,
			deliveryAddress: customers.deliveryAddress
		})
		.from(customers);

	const placeList = await db
		.select({ value: placeNames.name, name: placeNames.name, fee: placeNames.fee })
		.from(placeNames)
		.where(eq(placeNames.isActive, true));

	// Display only — the dialogs preview "delivery is free over X" with it. The
	// fee that gets stored is always recomputed in the actions below.
	const freeDeliveryThreshold = await db
		.select({ value: freeDelivery.threshold })
		.from(freeDelivery)
		.limit(1)
		.then((rows) => rows[0]?.value ?? null);

	const allData = await db
		.select({
			id: orders.id,
			name: customers.name,
			customerId: customers.id,
			email: customers.email,
			phone: customers.phone,
			address: orders.address,
			deliveryAddress: orders.deliveryAddress,
			fee: orders.fee,
			paymentMethod: transactions.paymentMethodId,
			paymentMethodName: paymentMethods.name,
			recieptLink: transactions.recieptLink,
			status: orders.status,
			createdAt: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d')`
		})
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(paymentMethods, eq(transactions.paymentMethodId, paymentMethods.id))
		.where(whereClause)
		.orderBy(desc(orders.createdAt))
		.limit(PAGE_SIZE)
		.offset(offset);

	const [{ total }] = await db
		.select({ total: count(orders.id) })
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(whereClause);

	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const orderIds = allData.map((o) => o.id);
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
		deleteForm,
		addCustomerForm,
		allData,
		allItems,
		fetchedProducts,
		fetchedCustomers,
		fetchedPrices,
		paymentMethodList,
		placeList,
		freeDeliveryThreshold,
		filters: {
			status,
			start,
			end,
			search,
			paymentMethod: paymentMethodFilter,
			pageSize: PAGE_SIZE
		},
		pagination: {
			currentPage: page,
			totalPages,
			totalCount: total,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1
		}
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { selectedProducts, customer, status, address, deliveryAddress } = form.data;

		// The address fields were previously collected by the dialog and then
		// dropped on the floor here, so every staff-created order showed a blank
		// delivery address in the table and had no fee.
		const fee = address ? await resolveDeliveryFee(address, getTotal(selectedProducts)) : null;

		if (address && fee === undefined) {
			setError(form, 'address', 'We do not deliver to that area');
			return message(
				form,
				{ type: 'error', text: 'We do not deliver to that area' },
				{ status: 400 }
			);
		}

		try {
			await db.transaction(async (tx) => {
				const [orderId] = await tx
					.insert(orders)
					.values({
						customerId: customer,
						status,
						address: address || null,
						deliveryAddress: deliveryAddress || null,
						fee,
						createdBy: locals?.user?.id
					})
					.$returningId();

				if (selectedProducts.length) {
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: orderId.id,
							productId: Number(product.product),
							amount: splitNumbers(product.amount).amount,
							quantity: Number(product.quantity),
							price: String(splitNumbers(product.amount).price),
							createdBy: locals?.user?.id
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Order Successfully Added' });
		} catch (err) {
			const field = duplicateField(err, orders);
			if (field) {
				setError(form, field as never, `This ${field} is already in use`);
				return message(form, { type: 'error', text: 'Order already exists' }, { status: 400 });
			}
			return message(form, {
				type: 'error',
				text: 'Error Adding Orders: ' + (err as Error)?.message
			});
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const {
			id,
			selectedProducts,
			customer,
			status,
			reciept,
			paymentMethod,
			address,
			deliveryAddress
		} = form.data;

		const fee = address ? await resolveDeliveryFee(address, getTotal(selectedProducts)) : null;

		if (address && fee === undefined) {
			setError(form, 'address', 'We do not deliver to that area');
			return message(
				form,
				{ type: 'error', text: 'We do not deliver to that area' },
				{ status: 400 }
			);
		}

		if (status === 'delivered' && !paymentMethod) {
			setError(form, 'paymentMethod', 'Payment Method is required for Delivered Orders');
			return message(
				form,
				{ type: 'error', text: 'Payment Method is required for Delivered Orders' },
				{ status: 400 }
			);
		}

		try {
			const existingOrder = await db
				.select({ status: orders.status, transactionId: orders.transactionId })
				.from(orders)
				.where(eq(orders.id, id))
				.then((rows) => rows[0]);

			if (!existingOrder) {
				return message(form, { type: 'error', text: 'Order not found' }, { status: 404 });
			}

			const previousStatus = existingOrder.status;
			const becameDelivered = previousStatus !== 'delivered' && status === 'delivered';
			const leftDelivered = previousStatus === 'delivered' && status !== 'delivered';

			await db.transaction(async (tx) => {
				let transactionId = existingOrder.transactionId ?? undefined;

				if (reciept) {
					const recieptLink = await saveUploadedFile(reciept);

					if (transactionId) {
						await tx
							.update(transactions)
							.set({
								paymentMethodId: paymentMethod,
								amount: String(getTotal(selectedProducts)),
								recieptLink,
								updatedBy: locals?.user?.id
							})
							.where(eq(transactions.id, transactionId));
					} else {
						const [tranId] = await tx
							.insert(transactions)
							.values({
								paymentMethodId: paymentMethod,
								amount: String(getTotal(selectedProducts)),
								recieptLink,
								createdBy: locals?.user?.id
							})
							.$returningId();
						transactionId = tranId.id;
					}
				}

				await tx
					.update(orders)
					.set({
						customerId: customer,
						status,
						address: address || null,
						deliveryAddress: deliveryAddress || null,
						fee,
						...(transactionId ? { transactionId } : {}),
						updatedBy: locals?.user?.id
					})
					.where(eq(orders.id, id));

				if (selectedProducts.length) {
					await tx.delete(orderItems).where(eq(orderItems.orderId, id));
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: id,
							productId: Number(product.product),
							amount: splitNumbers(product.amount).amount,
							quantity: Number(product.quantity),
							price: String(splitNumbers(product.amount).price),
							updatedBy: locals?.user?.id
						}))
					);
				}

				// Stock tracker: only fires on an actual transition across "delivered",
				// so re-saving an already-delivered (or never-delivered) order is a no-op.
				if (becameDelivered || leftDelivered) {
					const sign = becameDelivered ? -1 : 1;
					const reason = becameDelivered ? `Order #${id} delivered` : `Order #${id} un-delivered`;

					for (const item of selectedProducts) {
						const productId = Number(item.product);
						const adjustment = sign * Number(item.quantity);

						await tx.insert(productAdjustments).values({
							productsId: productId,
							adjustment,
							reason,
							transactionId,
							createdBy: locals?.user?.id
						});
						await tx
							.update(products)
							.set({
								quantity: sql`quantity + ${adjustment}`,
								updatedBy: locals?.user?.id
							})
							.where(eq(products.id, productId));
					}
				}
			});

			if (becameDelivered) {
				const customerInfo = await db
					.select({ name: customers.name, email: customers.email })
					.from(customers)
					.where(eq(customers.id, customer))
					.then((rows) => rows[0]);

				const total = getTotal(selectedProducts);

				if (customerInfo?.email) {
					sendEmail(
						customerInfo.email,
						customerDeliveredTemplate(id, selectedProducts, total).subject,
						customerDeliveredTemplate(id, selectedProducts, total).html
					).catch((err) => console.error('Email Error (Customer):', err));
				}

				sendEmail(
					USER,
					adminDeliveredTemplate(id, selectedProducts, total).subject,
					adminDeliveredTemplate(id, selectedProducts, total).html
				).catch((err) => console.error('Email Error (Admin):', err));
			}

			return message(form, { type: 'success', text: 'Order Successfully Updated' });
		} catch (err) {
			const field = duplicateField(err, orders);
			if (field) {
				setError(form, field as never, `This ${field} is already in use`);
				return message(form, { type: 'error', text: 'Order already exists' }, { status: 400 });
			}
			console.error((err as Error)?.message);
			return message(form, {
				type: 'error',
				text: 'Error Updating Orders: ' + (err as Error)?.message
			});
		}
	},

	delete: async ({ request }) => {
		const form = await superValidate(request, zod4(idSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
		}

		const id = Number(form.data.id);

		try {
			// `orderItems.orderId` has no ON DELETE CASCADE, so items must go first.
			await db.transaction(async (tx) => {
				await tx.delete(orderItems).where(eq(orderItems.orderId, id));
				await tx.delete(orders).where(eq(orders.id, id));
			});
			return message(form, { type: 'success', text: 'Order deleted' });
		} catch (err) {
			console.error('Failed to delete order:', err);
			return message(form, { type: 'error', text: 'Could not delete order' }, { status: 500 });
		}
	}
};

/**
 * Split "<price> <package label>" back into its parts. Only the *first* space
 * separates the two — `split(' ')[1]` dropped everything after it, so a label
 * like "12 pieces" was stored as "12".
 */
function splitNumbers(input: string) {
	const separator = input.indexOf(' ');
	if (separator === -1) return { price: Number(input), amount: '' };

	return {
		price: Number(input.slice(0, separator)),
		amount: input.slice(separator + 1)
	};
}

type SelectedProduct = {
	product: number;
	quantity: number;
	amount: string; // e.g. "200.00 50g"
};

function getTotal(selectedProducts: SelectedProduct[] = []): number {
	return selectedProducts.reduce((total, item) => {
		const price = parseFloat(item?.amount?.split(' ')[0] ?? '0');
		return total + price * (item.quantity ?? 0);
	}, 0);
}
