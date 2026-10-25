import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, or, like, gte, lte, desc, sql, count, inArray } from 'drizzle-orm';
import {
	sendEmail,
	customerDeliveredTemplate,
	adminDeliveredTemplate,
	ADMIN_EMAIL
} from '$lib/server/email';

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
	placeNames,
	freeDelivery
} from '$lib/server/db/schema';
import { resolveDeliveryFee } from '$lib/server/delivery';
import { StockError, stockTarget, syncOrderStock } from '$lib/server/inventory';
import { PICKUP_LABEL } from '$lib/delivery';
import { idSchema } from '$lib/server/crud';
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
	// `Math.max(1, NaN)` is NaN, so `?page=abc` reached `.offset(NaN)` and 500'd.
	const parsedPage = parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
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

	const deliveryAreas = await db
		.select({ value: placeNames.name, name: placeNames.name, fee: placeNames.fee })
		.from(placeNames)
		.where(eq(placeNames.isActive, true));
	// Pickup isn't a `place_names` row, so without this a pickup order opened in the
	// edit dialog showed an empty "Delivery Area", and staff had no way to enter one.
	// `resolveDeliveryFee` already treats this label as free.
	const placeList = [{ value: PICKUP_LABEL, name: PICKUP_LABEL, fee: '0.00' }, ...deliveryAreas];

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

		let lineItems: StaffLineItem[];
		try {
			lineItems = await resolveStaffLineItems(selectedProducts);
		} catch (err) {
			return message(form, { type: 'error', text: (err as Error).message }, { status: 400 });
		}

		// The address fields were previously collected by the dialog and then
		// dropped on the floor here, so every staff-created order showed a blank
		// delivery address in the table and had no fee.
		const fee = address ? await resolveDeliveryFee(address, sumLineItems(lineItems)) : null;

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

				await tx.insert(orderItems).values(
					lineItems.map(({ productName: _name, ...item }) => ({
						orderId: orderId.id,
						...item,
						createdBy: locals?.user?.id
					}))
				);
			});

			return message(form, { type: 'success', text: 'Order Successfully Added' });
		} catch (err) {
			console.error('Failed to add order:', err);
			return message(form, { type: 'error', text: 'Could not add the order' }, { status: 500 });
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

		let lineItems: StaffLineItem[];
		try {
			lineItems = await resolveStaffLineItems(selectedProducts);
		} catch (err) {
			return message(form, { type: 'error', text: (err as Error).message }, { status: 400 });
		}

		const subtotal = sumLineItems(lineItems);
		const fee = address ? await resolveDeliveryFee(address, subtotal) : null;

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

		const total = subtotal + Number(fee ?? 0);

		try {
			const existingOrder = await db
				.select({ status: orders.status, transactionId: orders.transactionId })
				.from(orders)
				.where(eq(orders.id, id))
				.then((rows) => rows[0]);

			if (!existingOrder) {
				return message(form, { type: 'error', text: 'Order not found' }, { status: 404 });
			}

			const wasDelivered = existingOrder.status === 'delivered';
			const isDelivered = status === 'delivered';
			const becameDelivered = !wasDelivered && isDelivered;
			const leftDelivered = wasDelivered && !isDelivered;

			// Written to disk before the transaction so a slow upload doesn't hold a
			// connection open. An empty file input means "keep the existing receipt".
			const recieptLink =
				reciept instanceof File && reciept.size > 0 ? await saveUploadedFile(reciept) : undefined;

			await db.transaction(async (tx) => {
				let transactionId = existingOrder.transactionId ?? undefined;

				// The payment record used to be written only when a receipt file was
				// uploaded, so a cash order marked delivered lost its payment method, and
				// nothing ever set `paymentStatus` — every payment total read 0.
				// A delivered order always carries a payment method (checked above), so it
				// counts as paid; taking it back out of delivered makes it pending again.
				// `amount` includes the delivery fee: it is what the customer paid.
				const payment = {
					amount: total.toFixed(2),
					paymentStatus: isDelivered ? ('paid' as const) : ('pending' as const),
					...(paymentMethod ? { paymentMethodId: paymentMethod } : {}),
					...(recieptLink ? { recieptLink } : {})
				};

				if (transactionId) {
					await tx
						.update(transactions)
						.set({ ...payment, updatedBy: locals?.user?.id })
						.where(eq(transactions.id, transactionId));
				} else if (paymentMethod || recieptLink) {
					const [tranId] = await tx
						.insert(transactions)
						.values({ ...payment, createdBy: locals?.user?.id })
						.$returningId();
					transactionId = tranId.id;
				}

				await tx
					.update(orders)
					.set({
						customerId: customer,
						status,
						address: address || null,
						deliveredAt: becameDelivered ? sql`NOW()` : isDelivered ? undefined : null,
						deliveryAddress: deliveryAddress || null,
						fee,
						...(transactionId ? { transactionId } : {}),
						updatedBy: locals?.user?.id
					})
					.where(eq(orders.id, id));

				await tx.delete(orderItems).where(eq(orderItems.orderId, id));
				await tx.insert(orderItems).values(
					lineItems.map(({ productName: _name, ...item }) => ({
						orderId: id,
						...item,
						updatedBy: locals?.user?.id
					}))
				);

				// A delivered order holds its items out of stock; any other status holds
				// none. The order's batch allocations record what it holds now, so this
				// one call covers delivering, un-delivering, and editing the items of an
				// order that stays delivered.
				const reason = becameDelivered
					? `Order #${id} delivered`
					: leftDelivered
						? `Order #${id} un-delivered`
						: `Order #${id} items changed`;

				await syncOrderStock(
					tx,
					id,
					isDelivered ? stockTarget(lineItems) : new Map(),
					{ reason, transactionId },
					locals?.user?.id
				);
			});

			if (becameDelivered) {
				const customerInfo = await db
					.select({ name: customers.name, email: customers.email })
					.from(customers)
					.where(eq(customers.id, customer))
					.then((rows) => rows[0]);

				const emailItems = toEmailItems(lineItems);

				if (customerInfo?.email) {
					const mail = customerDeliveredTemplate(id, emailItems, total);
					sendEmail(customerInfo.email, mail.subject, mail.html).catch((err) =>
						console.error('Email Error (Customer):', err)
					);
				}

				const adminMail = adminDeliveredTemplate(id, emailItems, total);
				sendEmail(ADMIN_EMAIL, adminMail.subject, adminMail.html).catch((err) =>
					console.error('Email Error (Admin):', err)
				);
			}

			return message(form, { type: 'success', text: 'Order Successfully Updated' });
		} catch (err) {
			if (err instanceof StockError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('Failed to update order:', err);
			return message(form, { type: 'error', text: 'Could not update the order' }, { status: 500 });
		}
	},

	delete: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(idSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
		}

		const id = Number(form.data.id);

		try {
			await db.transaction(async (tx) => {
				const order = await tx
					.select({ status: orders.status, transactionId: orders.transactionId })
					.from(orders)
					.where(eq(orders.id, id))
					.then((rows) => rows[0]);

				if (!order) return;

				// A delivered order's items were taken out of stock; deleting the order
				// has to put them back, or the units are lost from inventory for good.
				await syncOrderStock(
					tx,
					id,
					new Map(),
					{ reason: `Order #${id} deleted`, transactionId: order.transactionId ?? undefined },
					locals?.user?.id
				);

				// `orderItems.orderId` has no ON DELETE CASCADE, so items must go first.
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

type StaffLineItem = {
	productId: number;
	priceId: number;
	productName: string | null;
	quantity: number;
	amount: string;
	price: string;
};

/**
 * Prices the order builder's rows from the `prices` table.
 *
 * The dialog posts each row as "<price> <label>". That string used to be written
 * straight into `order_items`, so a stale or edited dialog could record any price.
 * Now it only *identifies* the variant: the label picks the product's variants,
 * and the posted price only breaks a tie between two variants that share a label.
 * The stored price is always the row from the database.
 *
 * Deactivated products are deliberately still accepted here — staff editing an
 * existing order must be able to keep a line whose product has since been retired.
 */
async function resolveStaffLineItems(
	selectedProducts: SelectedProduct[]
): Promise<StaffLineItem[]> {
	const productIds = [...new Set(selectedProducts.map((p) => Number(p.product)))];

	const variants = await db
		.select({
			id: prices.id,
			productId: prices.productId,
			productName: products.name,
			amount: prices.amount,
			price: prices.price
		})
		.from(prices)
		.innerJoin(products, eq(prices.productId, products.id))
		.where(inArray(prices.productId, productIds));

	return selectedProducts.map((item) => {
		const productId = Number(item.product);
		const posted = splitNumbers(item.amount);
		const candidates = variants.filter(
			(v) => v.productId === productId && v.amount === posted.amount
		);
		const variant =
			candidates.find((v) => Number(v.price) === posted.price) ??
			(candidates.length === 1 ? candidates[0] : undefined);

		if (!variant) {
			throw new Error(
				`The package "${posted.amount}" is no longer available for one of the products. Please pick it again.`
			);
		}

		return {
			productId,
			priceId: variant.id,
			productName: variant.productName,
			quantity: Number(item.quantity),
			amount: variant.amount,
			price: variant.price
		};
	});
}

/** Sums in whole cents so repeated decimal addition can't drift. */
function sumLineItems(lineItems: Array<{ quantity: number; price: string }>): number {
	const cents = lineItems.reduce(
		(acc, item) => acc + Math.round(Number(item.price) * 100) * item.quantity,
		0
	);
	return cents / 100;
}

function toEmailItems(lineItems: StaffLineItem[]) {
	return lineItems.map((item) => ({
		product: item.productId,
		name: item.productName ?? undefined,
		quantity: item.quantity,
		amount: item.amount,
		price: Number(item.price)
	}));
}
