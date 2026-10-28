// Delivery tracking. Every change to a `deliveries` row goes through here, so
// that the delivery, its order, the stock the order holds and the audit trail in
// `delivery_events` always move together. See the diagram on `deliveries` in the
// schema for the states.
//
// Callers open the transaction and pass it in; emails are sent by the callers
// after it commits, from what these functions return.

import { eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { MySqlColumn } from 'drizzle-orm/mysql-core';
import { db } from '$lib/server/db';
import {
	customers,
	deliveries,
	deliveryEvents,
	orderBatchAllocations,
	orderItems,
	orders,
	prices,
	products,
	stockBatches,
	transactions,
	user
} from '$lib/server/db/schema';
import { stockTarget, syncOrderStock, type Tx } from '$lib/server/inventory';
import { PICKUP_LABEL } from '$lib/delivery';
import {
	ADMIN_EMAIL,
	adminDeliveredTemplate,
	customerDeliveredTemplate,
	customerDispatchedTemplate,
	sendEmail
} from '$lib/server/email';

/** A refused transition, worded for the person who asked for it. */
export class DeliveryError extends Error {}

export type DeliveryStatus = (typeof deliveries.status.enumValues)[number];

/** Deliveries still to be completed: the ones the team is working on. */
export const OPEN_STATUSES: DeliveryStatus[] = ['ready', 'dispatched', 'failed'];

// --- Time -------------------------------------------------------------------
// Staff type times in Addis Ababa; the database stores them in its session's
// time zone, like every `NOW()` it writes. These convert at the boundary, the
// same way the dashboard's "today" queries do.

/** A `datetime-local` value ("2026-10-28T14:30"), read as Addis Ababa time. */
export const fromAddis = (local: string) =>
	sql`CONVERT_TZ(${local.replace('T', ' ')}, '+03:00', @@session.time_zone)`;

/** A datetime column as "YYYY-MM-DD HH:MM" in Addis Ababa, or NULL. */
export const inAddis = (column: MySqlColumn | SQL) =>
	sql<
		string | null
	>`DATE_FORMAT(CONVERT_TZ(${column}, @@session.time_zone, '+03:00'), '%Y-%m-%d %H:%i')`;

/** Rejects a time more than a few minutes ahead: a delivery can't have happened yet. */
export function assertNotFuture(local: string | null | undefined, what: string) {
	if (!local) return;
	const at = Date.parse(`${local.length === 16 ? `${local}:00` : local}+03:00`);
	if (Number.isNaN(at)) throw new DeliveryError(`${what} is not a valid date and time.`);
	if (at > Date.now() + 5 * 60 * 1000) throw new DeliveryError(`${what} can't be in the future.`);
}

// --- Internals --------------------------------------------------------------

type Actor = { userId?: string; byCustomer?: boolean };

async function logEvent(
	tx: Tx,
	deliveryId: number,
	event: string,
	note: string | null,
	{ userId, byCustomer = false }: Actor
) {
	await tx.insert(deliveryEvents).values({
		deliveryId,
		event,
		note: note?.slice(0, 255) ?? null,
		userId: userId ?? null,
		byCustomer
	});
}

/** Locks the delivery and its order, and returns what the transitions need. */
async function lockDelivery(tx: Tx, id: number) {
	const [row] = await tx
		.select({
			id: deliveries.id,
			orderId: deliveries.orderId,
			status: deliveries.status,
			method: deliveries.method,
			dispatchedAt: deliveries.dispatchedAt,
			orderStatus: orders.status,
			transactionId: orders.transactionId
		})
		.from(deliveries)
		.innerJoin(orders, eq(orders.id, deliveries.orderId))
		.where(eq(deliveries.id, id))
		.for('update');
	if (!row) throw new DeliveryError('That delivery no longer exists.');
	return row;
}

function requireStatus(current: DeliveryStatus, allowed: DeliveryStatus[], action: string) {
	if (!allowed.includes(current)) {
		throw new DeliveryError(`A ${label(current).toLowerCase()} delivery can't be ${action}.`);
	}
}

/** What the order costs now, read inside the transaction so fresh edits count. */
async function orderTotal(tx: Tx | typeof db, orderId: number) {
	const [row] = await tx
		.select({
			itemsCents: sql<string>`COALESCE(SUM(ROUND(${orderItems.price} * 100) * ${orderItems.quantity}), 0)`,
			fee: orders.fee
		})
		.from(orders)
		.leftJoin(orderItems, eq(orderItems.orderId, orders.id))
		.where(eq(orders.id, orderId))
		.groupBy(orders.id, orders.fee);
	return row ? (Number(row.itemsCents) + Math.round(Number(row.fee ?? 0) * 100)) / 100 : 0;
}

async function isPaid(tx: Tx, transactionId: number | null) {
	if (!transactionId) return false;
	const [row] = await tx
		.select({ status: transactions.paymentStatus })
		.from(transactions)
		.where(eq(transactions.id, transactionId));
	return row?.status === 'paid';
}

/** Takes the order's items out of stock — the batches that leave on the truck. */
async function holdStock(
	tx: Tx,
	orderId: number,
	transactionId: number | null,
	reason: string,
	userId?: string
) {
	const items = await tx
		.select({ priceId: orderItems.priceId, quantity: orderItems.quantity })
		.from(orderItems)
		.where(eq(orderItems.orderId, orderId));
	await syncOrderStock(
		tx,
		orderId,
		stockTarget(items),
		{ reason, transactionId: transactionId ?? undefined },
		userId
	);
}

async function releaseStock(
	tx: Tx,
	orderId: number,
	transactionId: number | null,
	reason: string,
	userId?: string
) {
	await syncOrderStock(
		tx,
		orderId,
		new Map(),
		{ reason, transactionId: transactionId ?? undefined },
		userId
	);
}

const nowOr = (local: string | null | undefined) => (local ? fromAddis(local) : sql`NOW()`);

/** "Out for delivery", not "dispatched": the words staff and customers use. */
export function label(status: DeliveryStatus | null | undefined) {
	switch (status) {
		case 'ready':
			return 'Ready to dispatch';
		case 'dispatched':
			return 'Out for delivery';
		case 'delivered':
			return 'Delivered';
		case 'failed':
			return 'Failed attempt';
		case 'cancelled':
			return 'Cancelled';
		default:
			return 'Not queued';
	}
}

// --- Transitions ------------------------------------------------------------

/**
 * Puts a pending order in the delivery queue, or brings back its cancelled
 * delivery. A no-op for an order already queued, so payment confirmation can call
 * it however many times it fires. Returns the delivery's id.
 *
 * An unpaid order is queued with its total as cash to collect — cash on delivery.
 */
export async function queueDelivery(tx: Tx, orderId: number, actor: Actor): Promise<number> {
	const [order] = await tx
		.select({
			status: orders.status,
			area: orders.address,
			address: orders.deliveryAddress,
			transactionId: orders.transactionId,
			name: customers.name,
			phone: customers.phone
		})
		.from(orders)
		.leftJoin(customers, eq(customers.id, orders.customerId))
		.where(eq(orders.id, orderId))
		.for('update');
	if (!order) throw new DeliveryError('That order no longer exists.');

	const [existing] = await tx
		.select({ id: deliveries.id, status: deliveries.status })
		.from(deliveries)
		.where(eq(deliveries.orderId, orderId))
		.for('update');
	if (existing && existing.status !== 'cancelled') return existing.id;

	if (order.status !== 'pending') {
		throw new DeliveryError(
			`Order #${orderId} is ${order.status}, so it can't be queued for delivery.`
		);
	}

	const paid = await isPaid(tx, order.transactionId);
	const snapshot = {
		method: order.area === PICKUP_LABEL ? ('pickup' as const) : ('delivery' as const),
		area: order.area,
		address: order.address === PICKUP_LABEL ? null : order.address,
		recipientName: order.name,
		recipientPhone: order.phone,
		cashToCollect: paid ? null : (await orderTotal(tx, orderId)).toFixed(2)
	};

	if (existing) {
		await tx
			.update(deliveries)
			.set({ ...snapshot, status: 'ready', failureReason: null, updatedBy: actor.userId })
			.where(eq(deliveries.id, existing.id));
		await logEvent(tx, existing.id, 'requeued', 'Order re-opened', actor);
		return existing.id;
	}

	const [created] = await tx
		.insert(deliveries)
		.values({ orderId, status: 'ready', ...snapshot, createdBy: actor.userId })
		.$returningId();
	await logEvent(
		tx,
		created.id,
		'queued',
		paid ? 'Payment confirmed' : `Cash on delivery: ETB ${snapshot.cashToCollect}`,
		actor
	);
	return created.id;
}

export type TripDetails = {
	driverId?: number | null;
	driverName?: string | null;
	driverPhone?: string | null;
	vehiclePlate?: string | null;
	vehicleType?: string | null;
	scheduledFor?: string | null;
	area?: string | null;
	address?: string | null;
	recipientName?: string | null;
	recipientPhone?: string | null;
	notes?: string | null;
};

function tripColumns(details: TripDetails) {
	const blank = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);
	return {
		driverId: details.driverId || null,
		driverName: blank(details.driverName),
		driverPhone: blank(details.driverPhone),
		vehiclePlate: blank(details.vehiclePlate)?.toUpperCase() ?? null,
		vehicleType: blank(details.vehicleType),
		scheduledFor: details.scheduledFor ? fromAddis(details.scheduledFor) : null,
		...(details.area !== undefined ? { area: blank(details.area) } : {}),
		...(details.address !== undefined ? { address: blank(details.address) } : {}),
		...(details.recipientName !== undefined ? { recipientName: blank(details.recipientName) } : {}),
		...(details.recipientPhone !== undefined
			? { recipientPhone: blank(details.recipientPhone) }
			: {}),
		notes: blank(details.notes)
	};
}

/**
 * The goods leave the shop: the order's items come out of stock, earliest expiry
 * first, and the batches they came from are recorded against the order. The
 * person dispatching is recorded as having approved it.
 */
export async function dispatchDelivery(
	tx: Tx,
	id: number,
	details: TripDetails & { dispatchedAt?: string | null },
	actor: Actor
) {
	const row = await lockDelivery(tx, id);
	requireStatus(row.status, ['ready', 'failed'], 'dispatched');
	if (row.orderStatus !== 'pending') {
		throw new DeliveryError(
			`Order #${row.orderId} is ${row.orderStatus}; only pending orders go out.`
		);
	}
	if (row.method === 'delivery' && !details.driverName?.trim()) {
		throw new DeliveryError('Choose or enter the driver taking this delivery.');
	}
	assertNotFuture(details.dispatchedAt, 'Dispatch time');

	await holdStock(
		tx,
		row.orderId,
		row.transactionId,
		`Order #${row.orderId} dispatched`,
		actor.userId
	);

	await tx
		.update(deliveries)
		.set({
			...tripColumns(details),
			status: 'dispatched',
			dispatchedAt: nowOr(details.dispatchedAt),
			dispatchedBy: actor.userId ?? null,
			attempts: sql`${deliveries.attempts} + 1`,
			failureReason: null,
			updatedBy: actor.userId
		})
		.where(eq(deliveries.id, id));

	const driver = details.driverName?.trim();
	await logEvent(
		tx,
		id,
		'dispatched',
		row.method === 'pickup'
			? 'Ready for pickup'
			: `Driver ${driver}${details.vehiclePlate ? ` (${details.vehiclePlate.toUpperCase()})` : ''}`,
		actor
	);
	return { orderId: row.orderId };
}

export type DeliveredInput = {
	deliveredAt?: string | null;
	receivedBy?: string | null;
	proofLink?: string | null;
	/** How an unpaid order was settled on delivery. Required from staff. */
	payment?: { paymentMethodId: number; recieptLink?: string | null } | null;
	note?: string | null;
};

/**
 * The customer has the goods. Staff can confirm from any open state — a pickup,
 * or a trip nobody logged as dispatched, takes its stock out here. A customer can
 * only confirm a delivery that is on its way to them; staff can reopen it.
 */
export async function markDelivered(tx: Tx, id: number, input: DeliveredInput, actor: Actor) {
	const row = await lockDelivery(tx, id);
	requireStatus(
		row.status,
		actor.byCustomer ? ['dispatched'] : ['ready', 'dispatched', 'failed'],
		'marked delivered'
	);
	assertNotFuture(input.deliveredAt, 'Delivery time');

	let transactionId = row.transactionId;
	if (!(await isPaid(tx, transactionId))) {
		if (input.payment) {
			const amount = (await orderTotal(tx, row.orderId)).toFixed(2);
			const payment = {
				amount,
				paymentStatus: 'paid' as const,
				paymentMethodId: input.payment.paymentMethodId,
				...(input.payment.recieptLink ? { recieptLink: input.payment.recieptLink } : {})
			};
			if (transactionId) {
				await tx
					.update(transactions)
					.set({ ...payment, updatedBy: actor.userId })
					.where(eq(transactions.id, transactionId));
			} else {
				const [created] = await tx
					.insert(transactions)
					.values({ ...payment, createdBy: actor.userId })
					.$returningId();
				transactionId = created.id;
				await tx.update(orders).set({ transactionId }).where(eq(orders.id, row.orderId));
			}
		} else if (!actor.byCustomer) {
			throw new DeliveryError(
				'This order is unpaid. Record how the customer paid before marking it delivered.'
			);
		}
	}

	if (row.status !== 'dispatched') {
		await holdStock(
			tx,
			row.orderId,
			transactionId,
			`Order #${row.orderId} delivered`,
			actor.userId
		);
	}

	const deliveredAt = nowOr(input.deliveredAt);
	await tx
		.update(deliveries)
		.set({
			status: 'delivered',
			deliveredAt,
			// A trip delivered without being logged as dispatched left when it arrived.
			...(row.dispatchedAt
				? {}
				: { dispatchedAt: deliveredAt, dispatchedBy: actor.userId ?? null }),
			confirmedBy: actor.userId ?? null,
			confirmedVia: actor.byCustomer ? 'customer' : 'staff',
			receivedBy: input.receivedBy?.trim() || null,
			...(input.proofLink ? { proofLink: input.proofLink } : {}),
			updatedBy: actor.userId
		})
		.where(eq(deliveries.id, id));

	await tx
		.update(orders)
		.set({ status: 'delivered', deliveredAt, updatedBy: actor.userId })
		.where(eq(orders.id, row.orderId));

	await logEvent(
		tx,
		id,
		'delivered',
		actor.byCustomer
			? 'Confirmed by the customer'
			: [input.receivedBy ? `Received by ${input.receivedBy}` : null, input.note]
					.filter(Boolean)
					.join(' — ') || null,
		actor
	);
	return { orderId: row.orderId };
}

/** The trip didn't reach the customer. The goods come back into stock. */
export async function markFailed(tx: Tx, id: number, reason: string, actor: Actor) {
	const row = await lockDelivery(tx, id);
	requireStatus(row.status, ['dispatched'], 'marked failed');

	await releaseStock(
		tx,
		row.orderId,
		row.transactionId,
		`Order #${row.orderId} delivery failed`,
		actor.userId
	);
	await tx
		.update(deliveries)
		.set({ status: 'failed', failureReason: reason.trim().slice(0, 255), updatedBy: actor.userId })
		.where(eq(deliveries.id, id));
	await logEvent(tx, id, 'failed', reason, actor);
	return { orderId: row.orderId };
}

/** A failed delivery goes back in the queue for another attempt. */
export async function requeueDelivery(
	tx: Tx,
	id: number,
	scheduledFor: string | null,
	actor: Actor
) {
	const row = await lockDelivery(tx, id);
	requireStatus(row.status, ['failed'], 'put back in the queue');
	await tx
		.update(deliveries)
		.set({
			status: 'ready',
			// The failed trip's departure stays in the history; this one hasn't left.
			dispatchedAt: null,
			dispatchedBy: null,
			...(scheduledFor ? { scheduledFor: fromAddis(scheduledFor) } : {}),
			updatedBy: actor.userId
		})
		.where(eq(deliveries.id, id));
	await logEvent(tx, id, 'requeued', null, actor);
	return { orderId: row.orderId };
}

/**
 * Takes back a delivery confirmation — a customer who tapped "received" too
 * early, or a hand-over marked by mistake. The goods are still out, so the
 * stock stays with the order; the order is pending again.
 */
export async function reopenDelivery(tx: Tx, id: number, reason: string, actor: Actor) {
	const row = await lockDelivery(tx, id);
	requireStatus(row.status, ['delivered'], 'reopened');
	await tx
		.update(deliveries)
		.set({
			status: 'dispatched',
			deliveredAt: null,
			confirmedBy: null,
			confirmedVia: null,
			receivedBy: null,
			updatedBy: actor.userId
		})
		.where(eq(deliveries.id, id));
	await tx
		.update(orders)
		.set({ status: 'pending', deliveredAt: null, updatedBy: actor.userId })
		.where(eq(orders.id, row.orderId));
	await logEvent(tx, id, 'reopened', reason, actor);
	return { orderId: row.orderId };
}

/** Changes the driver, the time promised, the destination or the notes. */
export async function updateTrip(tx: Tx, id: number, details: TripDetails, actor: Actor) {
	const row = await lockDelivery(tx, id);
	requireStatus(row.status, ['ready', 'dispatched', 'failed', 'delivered'], 'changed');
	if (row.method === 'delivery' && row.status === 'dispatched' && !details.driverName?.trim()) {
		throw new DeliveryError('A delivery on its way needs a driver.');
	}
	await tx
		.update(deliveries)
		.set({ ...tripColumns(details), updatedBy: actor.userId })
		.where(eq(deliveries.id, id));
	await logEvent(tx, id, 'updated', 'Trip details changed', actor);
	return { orderId: row.orderId };
}

/**
 * The order was cancelled: its delivery stops, and anything already taken out
 * for it goes back into stock. Called from the order's own edit.
 */
export async function cancelOrderDelivery(tx: Tx, orderId: number, actor: Actor) {
	const [row] = await tx
		.select({ id: deliveries.id, status: deliveries.status })
		.from(deliveries)
		.where(eq(deliveries.orderId, orderId))
		.for('update');
	if (!row || !OPEN_STATUSES.includes(row.status)) return;
	const [order] = await tx
		.select({ transactionId: orders.transactionId })
		.from(orders)
		.where(eq(orders.id, orderId));
	await releaseStock(
		tx,
		orderId,
		order?.transactionId ?? null,
		`Order #${orderId} cancelled`,
		actor.userId
	);
	await tx
		.update(deliveries)
		.set({ status: 'cancelled', updatedBy: actor.userId })
		.where(eq(deliveries.id, row.id));
	await logEvent(tx, row.id, 'cancelled', 'Order cancelled', actor);
}

/**
 * Keeps an open delivery's cash-to-collect in step with its order: the total
 * while unpaid, nothing once paid. Called after the order is edited.
 */
export async function syncCashToCollect(tx: Tx, orderId: number) {
	const [row] = await tx
		.select({ id: deliveries.id, status: deliveries.status, transactionId: orders.transactionId })
		.from(deliveries)
		.innerJoin(orders, eq(orders.id, deliveries.orderId))
		.where(eq(deliveries.orderId, orderId));
	if (!row || !OPEN_STATUSES.includes(row.status)) return;
	const paid = await isPaid(tx, row.transactionId);
	await tx
		.update(deliveries)
		.set({ cashToCollect: paid ? null : (await orderTotal(tx, orderId)).toFixed(2) })
		.where(eq(deliveries.id, row.id));
}

/** Whether the order's items are out of stock right now: on the truck, or delivered. */
export async function orderHoldsStock(tx: Tx, orderId: number) {
	const [row] = await tx
		.select({ orderStatus: orders.status, deliveryStatus: deliveries.status })
		.from(orders)
		.leftJoin(deliveries, eq(deliveries.orderId, orders.id))
		.where(eq(orders.id, orderId));
	return row?.orderStatus === 'delivered' || row?.deliveryStatus === 'dispatched';
}

// --- Reads ------------------------------------------------------------------

/**
 * The batches each order's items went out in, by order then product. Read from
 * the order's batch allocations, so it is what the order holds right now.
 */
export async function batchesForOrders(orderIds: number[]) {
	if (orderIds.length === 0) return [];
	return db
		.select({
			orderId: orderBatchAllocations.orderId,
			product: products.name,
			variant: prices.amount,
			batchNumber: stockBatches.batchNumber,
			expiresAt: stockBatches.expiresAt,
			quantity: orderBatchAllocations.quantity
		})
		.from(orderBatchAllocations)
		.innerJoin(stockBatches, eq(stockBatches.id, orderBatchAllocations.batchId))
		.innerJoin(prices, eq(prices.id, orderBatchAllocations.variantId))
		.leftJoin(products, eq(products.id, prices.productId))
		.where(inArray(orderBatchAllocations.orderId, orderIds))
		.orderBy(orderBatchAllocations.orderId, products.name, stockBatches.batchNumber);
}

// --- Mail -------------------------------------------------------------------

async function recipientOf(orderId: number) {
	const [row] = await db
		.select({ email: sql<string | null>`COALESCE(${customers.email}, ${user.email})` })
		.from(orders)
		.innerJoin(customers, eq(customers.id, orders.customerId))
		.leftJoin(user, eq(user.id, customers.userId))
		.where(eq(orders.id, orderId));
	return row?.email ?? null;
}

/** Tells the customer their order is on its way. Never throws. */
export async function sendDispatchedMail(orderId: number) {
	try {
		const [trip] = await db
			.select({
				method: deliveries.method,
				driverName: deliveries.driverName,
				driverPhone: deliveries.driverPhone,
				vehiclePlate: deliveries.vehiclePlate,
				vehicleType: deliveries.vehicleType,
				expected: inAddis(deliveries.scheduledFor),
				cashToCollect: deliveries.cashToCollect,
				transactionId: orders.transactionId
			})
			.from(deliveries)
			.innerJoin(orders, eq(orders.id, deliveries.orderId))
			.where(eq(deliveries.orderId, orderId));
		const email = await recipientOf(orderId);
		if (!trip || !email) return;

		const paid = await db
			.select({ status: transactions.paymentStatus })
			.from(transactions)
			.where(eq(transactions.id, trip.transactionId ?? 0))
			.then((rows) => rows[0]?.status === 'paid');

		const mail = customerDispatchedTemplate(orderId, {
			pickup: trip.method === 'pickup',
			driverName: trip.driverName,
			driverPhone: trip.driverPhone,
			vehicle: [trip.vehicleType, trip.vehiclePlate].filter(Boolean).join(' · ') || null,
			expected: trip.expected,
			cashToCollect: !paid && trip.cashToCollect ? Number(trip.cashToCollect) : null
		});
		await sendEmail(email, mail.subject, mail.html);
	} catch (err) {
		console.error(`Email Error (Dispatched #${orderId}):`, err);
	}
}

/** The delivered emails, to the customer and to the shop. Never throws. */
export async function sendDeliveredMail(orderId: number) {
	try {
		const items = await db
			.select({
				product: orderItems.productId,
				name: products.name,
				quantity: orderItems.quantity,
				amount: orderItems.amount,
				price: sql<number>`${orderItems.price}`.mapWith(Number)
			})
			.from(orderItems)
			.leftJoin(products, eq(products.id, orderItems.productId))
			.where(eq(orderItems.orderId, orderId));
		const total = await orderTotal(db, orderId);
		const email = await recipientOf(orderId);

		if (email) {
			const mail = customerDeliveredTemplate(orderId, items, total);
			await sendEmail(email, mail.subject, mail.html);
		}
		const adminMail = adminDeliveredTemplate(orderId, items, total);
		await sendEmail(ADMIN_EMAIL, adminMail.subject, adminMail.html);
	} catch (err) {
		console.error(`Email Error (Delivered #${orderId}):`, err);
	}
}
