import { fail } from '@sveltejs/kit';
import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, asc, count, desc, eq, inArray, like, or, sql, type SQL } from 'drizzle-orm';
import { type AnyMySqlColumn, type MySqlSelect } from 'drizzle-orm/mysql-core';

import { db } from '$lib/server/db';
import {
	customers,
	deliveries,
	deliveryDrivers,
	deliveryEvents,
	orderBatchAllocations,
	orderItems,
	orders,
	paymentMethods,
	products,
	stockBatches,
	transactions,
	user
} from '$lib/server/db/schema';
import {
	batchesForOrders,
	DeliveryError,
	dispatchDelivery,
	inAddis,
	markDelivered,
	markFailed,
	OPEN_STATUSES,
	queueDelivery,
	reopenDelivery,
	requeueDelivery,
	sendDeliveredMail,
	sendDispatchedMail,
	updateTrip
} from '$lib/server/deliveries';
import { StockError } from '$lib/server/inventory';
import { saveUploadedFile } from '$lib/server/upload';
import { normalizeEthiopianPhone } from '$lib/validators/phone';
import {
	buildWhere,
	contains,
	facetCounts,
	orderBy,
	parseTableQuery,
	serverTable
} from '$lib/server/table';
import { deliver, requeue, trip, withReason } from './schema';
import type { Actions, PageServerLoad } from './$types';

/** The status buttons above the table. `active` is everything still to finish. */
const PRESETS = [
	'active',
	'ready',
	'dispatched',
	'late',
	'delivered',
	'failed',
	'cancelled',
	'all'
] as const;
type Preset = (typeof PRESETS)[number];

/** Which date the toolbar's date window narrows. */
const DATE_COLUMNS = {
	queued: deliveries.createdAt,
	dispatched: deliveries.dispatchedAt,
	delivered: deliveries.deliveredAt,
	scheduled: deliveries.scheduledFor
} as const;
type DateOn = keyof typeof DATE_COLUMNS;

/** Promised time has passed and it hasn't arrived. */
const late = sql`(${deliveries.status} IN ('ready', 'dispatched') AND ${deliveries.scheduledFor} < NOW())`;

const presetCondition = (preset: Preset): SQL | undefined => {
	switch (preset) {
		case 'active':
			return inArray(deliveries.status, OPEN_STATUSES);
		case 'late':
			return late;
		case 'all':
			return undefined;
		default:
			return eq(deliveries.status, preset);
	}
};

/** The name of the user an id column points at. */
const nameOf = (column: AnyMySqlColumn) =>
	sql<string | null>`(SELECT u.name FROM ${user} u WHERE u.id = ${column})`;

export const load: PageServerLoad = async ({ url }) => {
	const statusParam = url.searchParams.get('status') ?? 'active';
	const status: Preset = PRESETS.includes(statusParam as Preset)
		? (statusParam as Preset)
		: 'active';
	const dateParam = url.searchParams.get('dateOn') ?? 'dispatched';
	const dateOn: DateOn = dateParam in DATE_COLUMNS ? (dateParam as DateOn) : 'dispatched';

	const query = parseTableQuery(
		url,
		['driverName', 'vehicleType', 'area', 'method', 'confirmedVia', 'dispatchedBy', 'payment'],
		20,
		[
			'orderId',
			'customer',
			'area',
			'driverName',
			'scheduledFor',
			'dispatchedAt',
			'deliveredAt',
			'status'
		]
	);

	const spec = {
		base: [presetCondition(status)],
		dateColumn: DATE_COLUMNS[dateOn],
		search: (term: string) => {
			const orderNumber = Number(term.replace(/^#/, ''));
			return or(
				Number.isInteger(orderNumber) && orderNumber > 0
					? eq(deliveries.orderId, orderNumber)
					: undefined,
				like(customers.name, contains(term)),
				like(customers.phone, contains(term)),
				like(deliveries.recipientName, contains(term)),
				like(deliveries.recipientPhone, contains(term)),
				like(deliveries.driverName, contains(term)),
				like(deliveries.driverPhone, contains(term)),
				like(deliveries.vehiclePlate, contains(term)),
				like(deliveries.area, contains(term)),
				like(deliveries.address, contains(term)),
				// Which deliveries carried a batch — for tracing a recall.
				sql`EXISTS (SELECT 1 FROM ${orderBatchAllocations} a JOIN ${stockBatches} b ON b.id = a.batch_id
					WHERE a.order_id = ${deliveries.orderId} AND b.batch_number LIKE ${contains(term)})`
			);
		},
		filters: {
			driverName: (v: string) => eq(deliveries.driverName, v),
			vehicleType: (v: string) => eq(deliveries.vehicleType, v),
			area: (v: string) => eq(deliveries.area, v),
			method: (v: string) =>
				v === 'delivery' || v === 'pickup' ? eq(deliveries.method, v) : undefined,
			confirmedVia: (v: string) =>
				v === 'staff' || v === 'customer' ? eq(deliveries.confirmedVia, v) : undefined,
			dispatchedBy: (v: string) => eq(deliveries.dispatchedBy, v),
			payment: (v: string) =>
				v === 'paid'
					? eq(transactions.paymentStatus, 'paid')
					: v === 'unpaid'
						? sql`(${transactions.paymentStatus} IS NULL OR ${transactions.paymentStatus} <> 'paid')`
						: undefined
		}
	};
	const where = buildWhere(query, spec);

	/** Every list and tally reads the same joins, so a filter means the same everywhere. */
	const joined = <T extends MySqlSelect>(qb: T) =>
		qb
			.innerJoin(orders, eq(orders.id, deliveries.orderId))
			.leftJoin(customers, eq(customers.id, orders.customerId))
			.leftJoin(transactions, eq(transactions.id, orders.transactionId));

	const facet = (column: SQL | AnyMySqlColumn, key: string, label?: SQL) =>
		joined(
			db
				.select({
					value: sql<string>`${column}`,
					label: sql<string>`${label ?? column}`,
					count: count()
				})
				.from(deliveries)
				.$dynamic()
		)
			.where(and(buildWhere(query, spec, { except: key as never }), sql`${column} IS NOT NULL`))
			.groupBy(sql`${column}`, sql`${label ?? column}`);

	const [rows, [{ total }], facets] = await Promise.all([
		joined(
			db
				.select({
					id: deliveries.id,
					orderId: deliveries.orderId,
					status: deliveries.status,
					method: deliveries.method,
					customer: customers.name,
					area: deliveries.area,
					address: deliveries.address,
					recipientName: deliveries.recipientName,
					recipientPhone: deliveries.recipientPhone,
					driverId: deliveries.driverId,
					driverName: deliveries.driverName,
					driverPhone: deliveries.driverPhone,
					vehiclePlate: deliveries.vehiclePlate,
					vehicleType: deliveries.vehicleType,
					queuedAt: inAddis(deliveries.createdAt),
					scheduledFor: inAddis(deliveries.scheduledFor),
					dispatchedAt: inAddis(deliveries.dispatchedAt),
					deliveredAt: inAddis(deliveries.deliveredAt),
					dispatchedBy: nameOf(deliveries.dispatchedBy),
					confirmedBy: nameOf(deliveries.confirmedBy),
					confirmedVia: deliveries.confirmedVia,
					receivedBy: deliveries.receivedBy,
					proofLink: deliveries.proofLink,
					cashToCollect: deliveries.cashToCollect,
					paid: sql<boolean>`${transactions.paymentStatus} = 'paid'`.mapWith(Boolean),
					attempts: deliveries.attempts,
					failureReason: deliveries.failureReason,
					notes: deliveries.notes,
					late: sql<boolean>`${late}`.mapWith(Boolean),
					minutes: sql<
						number | null
					>`TIMESTAMPDIFF(MINUTE, ${deliveries.dispatchedAt}, ${deliveries.deliveredAt})`.mapWith(
						(v) => (v === null ? null : Number(v))
					)
				})
				.from(deliveries)
				.$dynamic()
		)
			.where(where)
			.orderBy(
				...(orderBy(query, {
					orderId: deliveries.orderId,
					customer: customers.name,
					area: deliveries.area,
					driverName: deliveries.driverName,
					scheduledFor: deliveries.scheduledFor,
					dispatchedAt: deliveries.dispatchedAt,
					deliveredAt: deliveries.deliveredAt,
					status: deliveries.status
				}) ?? [
					// Late first, then the soonest promised, then the oldest in the queue.
					desc(late),
					sql`${deliveries.scheduledFor} IS NULL`,
					asc(deliveries.scheduledFor),
					desc(deliveries.updatedAt)
				]),
				desc(deliveries.id)
			)
			.limit(query.limit)
			.offset(query.offset),
		joined(db.select({ total: count() }).from(deliveries).$dynamic()).where(where),
		facetCounts({
			driverName: () => facet(deliveries.driverName, 'driverName'),
			vehicleType: () => facet(deliveries.vehicleType, 'vehicleType'),
			area: () => facet(deliveries.area, 'area'),
			method: () => facet(deliveries.method, 'method'),
			confirmedVia: () => facet(deliveries.confirmedVia, 'confirmedVia'),
			dispatchedBy: () =>
				facet(deliveries.dispatchedBy, 'dispatchedBy', nameOf(deliveries.dispatchedBy)),
			payment: () =>
				facet(
					sql`CASE WHEN ${transactions.paymentStatus} = 'paid' THEN 'paid' ELSE 'unpaid' END`,
					'payment'
				)
		})
	]);

	const orderIds = rows.map((r) => r.orderId);
	const deliveryIds = rows.map((r) => r.id);

	const [items, batches, events] = await Promise.all([
		orderIds.length
			? db
					.select({
						orderId: orderItems.orderId,
						product: products.name,
						amount: orderItems.amount,
						quantity: orderItems.quantity
					})
					.from(orderItems)
					.leftJoin(products, eq(products.id, orderItems.productId))
					.where(inArray(orderItems.orderId, orderIds))
			: [],
		batchesForOrders(orderIds),
		deliveryIds.length
			? db
					.select({
						deliveryId: deliveryEvents.deliveryId,
						event: deliveryEvents.event,
						note: deliveryEvents.note,
						by: user.name,
						byCustomer: deliveryEvents.byCustomer,
						at: inAddis(deliveryEvents.createdAt)
					})
					.from(deliveryEvents)
					.leftJoin(user, eq(user.id, deliveryEvents.userId))
					.where(inArray(deliveryEvents.deliveryId, deliveryIds))
					.orderBy(asc(deliveryEvents.createdAt), asc(deliveryEvents.id))
			: []
	]);

	const allData = rows.map((row) => ({
		...row,
		items: items.filter((i) => i.orderId === row.orderId),
		batches: batches.filter((b) => b.orderId === row.orderId),
		events: events.filter((e) => e.deliveryId === row.id)
	}));

	return {
		allData,
		status,
		dateOn,
		stats: await stats(),
		drivers: await db
			.select({
				id: deliveryDrivers.id,
				name: deliveryDrivers.name,
				phone: deliveryDrivers.phone,
				vehiclePlate: deliveryDrivers.vehiclePlate,
				vehicleType: deliveryDrivers.vehicleType
			})
			.from(deliveryDrivers)
			.where(eq(deliveryDrivers.isActive, true))
			.orderBy(asc(deliveryDrivers.name)),
		paymentMethodList: await db
			.select({ value: paymentMethods.id, name: paymentMethods.name })
			.from(paymentMethods)
			.where(eq(paymentMethods.isActive, true))
			.orderBy(asc(paymentMethods.name)),
		queueable: await queueableOrders(),
		tripForm: await superValidate(zod4(trip), { id: 'trip' }),
		deliverForm: await superValidate(zod4(deliver), { id: 'deliver' }),
		reasonForm: await superValidate(zod4(withReason), { id: 'reason' }),
		requeueForm: await superValidate(zod4(requeue), { id: 'requeue' }),
		table: serverTable(query, total, facets)
	};
};

/** The cards above the table. Today is Addis Ababa's today. */
async function stats() {
	const today = sql`DATE(CONVERT_TZ(${deliveries.deliveredAt}, @@session.time_zone, '+03:00')) = DATE(CONVERT_TZ(NOW(), @@session.time_zone, '+03:00'))`;
	const [row] = await db
		.select({
			ready: sql<number>`SUM(${deliveries.status} = 'ready')`.mapWith(Number),
			dispatched: sql<number>`SUM(${deliveries.status} = 'dispatched')`.mapWith(Number),
			failed: sql<number>`SUM(${deliveries.status} = 'failed')`.mapWith(Number),
			late: sql<number>`SUM(${late})`.mapWith(Number),
			deliveredToday: sql<number>`SUM(${deliveries.status} = 'delivered' AND ${today})`.mapWith(
				Number
			),
			// Minutes from leaving the shop to the customer, over the last 30 days.
			avgMinutes: sql<number | null>`AVG(CASE WHEN ${deliveries.status} = 'delivered'
				AND ${deliveries.method} = 'delivery'
				AND ${deliveries.deliveredAt} >= NOW() - INTERVAL 30 DAY
				AND ${deliveries.deliveredAt} > ${deliveries.dispatchedAt}
				THEN TIMESTAMPDIFF(MINUTE, ${deliveries.dispatchedAt}, ${deliveries.deliveredAt}) END)`.mapWith(
				(v) => (v === null ? null : Math.round(Number(v)))
			),
			// Cash the drivers out right now are carrying back.
			cashOut: sql<number>`COALESCE(SUM(CASE WHEN ${deliveries.status} = 'dispatched'
				AND (${transactions.paymentStatus} IS NULL OR ${transactions.paymentStatus} <> 'paid')
				THEN ${deliveries.cashToCollect} END), 0)`.mapWith(Number)
		})
		.from(deliveries)
		.innerJoin(orders, eq(orders.id, deliveries.orderId))
		.leftJoin(transactions, eq(transactions.id, orders.transactionId));
	return row;
}

/** Pending orders with no delivery under way, for the "Queue order" picker. */
function queueableOrders() {
	return db
		.select({
			value: orders.id,
			name: sql<string>`CONCAT('#', ${orders.id}, ' — ', COALESCE(${customers.name}, 'Unknown'),
				IF(${transactions.paymentStatus} = 'paid', ' (paid)', ' (unpaid — cash on delivery)'))`
		})
		.from(orders)
		.leftJoin(customers, eq(customers.id, orders.customerId))
		.leftJoin(transactions, eq(transactions.id, orders.transactionId))
		.leftJoin(deliveries, eq(deliveries.orderId, orders.id))
		.where(
			and(
				eq(orders.status, 'pending'),
				or(sql`${deliveries.id} IS NULL`, eq(deliveries.status, 'cancelled'))
			)
		)
		.orderBy(desc(orders.id))
		.limit(200);
}

/** Runs a transition, turning the errors staff can fix into a form message. */
async function attempt<T>(
	run: () => Promise<T>
): Promise<{ ok: true; value: T } | { ok: false; text: string }> {
	try {
		return { ok: true, value: await run() };
	} catch (err) {
		if (err instanceof DeliveryError || err instanceof StockError)
			return { ok: false, text: err.message };
		console.error('Delivery action failed:', err);
		return { ok: false, text: 'Something went wrong. Nothing was changed.' };
	}
}

const tripDetails = (data: {
	driverId: number;
	driverName?: string;
	driverPhone?: string;
	vehiclePlate?: string;
	vehicleType?: string;
	scheduledFor?: string;
	area?: string;
	address?: string;
	recipientName?: string;
	recipientPhone?: string;
	notes?: string;
}) => ({
	...data,
	driverPhone: normalizeEthiopianPhone(data.driverPhone) ?? null,
	recipientPhone: normalizeEthiopianPhone(data.recipientPhone) ?? null
});

export const actions: Actions = {
	/** From the orders table, or the "Queue order" picker: a plain form with `orderId`. */
	queue: async ({ request, locals }) => {
		const orderId = Number((await request.formData()).get('orderId'));
		if (!Number.isInteger(orderId) || orderId <= 0) return fail(400, { message: 'Pick an order' });
		const result = await attempt(() =>
			db.transaction((tx) => queueDelivery(tx, orderId, { userId: locals.user?.id }))
		);
		if (!result.ok) return fail(400, { message: result.text });
		return { message: `Order #${orderId} queued for delivery` };
	},

	dispatch: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(trip));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const { id, dispatchedAt, ...details } = form.data;
		const result = await attempt(() =>
			db.transaction((tx) =>
				dispatchDelivery(
					tx,
					id,
					{ ...tripDetails(details), dispatchedAt },
					{ userId: locals.user?.id }
				)
			)
		);
		if (!result.ok) return message(form, { type: 'error', text: result.text }, { status: 400 });

		sendDispatchedMail(result.value.orderId);
		return message(form, { type: 'success', text: `Order #${result.value.orderId} is on its way` });
	},

	update: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(trip));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		// `dispatchedAt` rides along unused: saving details never dispatches.
		const { id, ...details } = form.data;
		const result = await attempt(() =>
			db.transaction((tx) => updateTrip(tx, id, tripDetails(details), { userId: locals.user?.id }))
		);
		if (!result.ok) return message(form, { type: 'error', text: result.text }, { status: 400 });
		return message(form, { type: 'success', text: 'Trip details saved' });
	},

	deliver: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(deliver));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const { id, deliveredAt, receivedBy, note, paymentMethod, proof } = form.data;

		// Validated before any upload, so a missing payment doesn't leave a stray file.
		const unpaid = await db
			.select({ status: transactions.paymentStatus })
			.from(deliveries)
			.innerJoin(orders, eq(orders.id, deliveries.orderId))
			.leftJoin(transactions, eq(transactions.id, orders.transactionId))
			.where(eq(deliveries.id, id))
			.then((rows) => rows[0]?.status !== 'paid');
		if (unpaid && !paymentMethod) {
			setError(form, 'paymentMethod', 'How did the customer pay?');
			return message(
				form,
				{ type: 'error', text: 'This order is unpaid — record how the customer paid.' },
				{ status: 400 }
			);
		}

		let proofLink: string | null = null;
		if (proof instanceof File && proof.size > 0) {
			try {
				proofLink = await saveUploadedFile(proof);
			} catch (err) {
				console.error('Could not save the proof of delivery:', err);
				return message(
					form,
					{ type: 'error', text: 'Could not upload the photo' },
					{ status: 500 }
				);
			}
		}

		const result = await attempt(() =>
			db.transaction((tx) =>
				markDelivered(
					tx,
					id,
					{
						deliveredAt,
						receivedBy,
						note,
						proofLink,
						payment: unpaid && paymentMethod ? { paymentMethodId: paymentMethod } : null
					},
					{ userId: locals.user?.id }
				)
			)
		);
		if (!result.ok) return message(form, { type: 'error', text: result.text }, { status: 400 });

		sendDeliveredMail(result.value.orderId);
		return message(form, { type: 'success', text: `Order #${result.value.orderId} delivered` });
	},

	fail: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(withReason));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please give a reason' }, { status: 400 });
		const result = await attempt(() =>
			db.transaction((tx) =>
				markFailed(tx, form.data.id, form.data.reason, { userId: locals.user?.id })
			)
		);
		if (!result.ok) return message(form, { type: 'error', text: result.text }, { status: 400 });
		return message(form, {
			type: 'success',
			text: `Order #${result.value.orderId} marked failed; its stock is back on the shelf`
		});
	},

	reopen: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(withReason));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please give a reason' }, { status: 400 });
		const result = await attempt(() =>
			db.transaction((tx) =>
				reopenDelivery(tx, form.data.id, form.data.reason, { userId: locals.user?.id })
			)
		);
		if (!result.ok) return message(form, { type: 'error', text: result.text }, { status: 400 });
		return message(form, {
			type: 'success',
			text: `Order #${result.value.orderId} is open again — no longer marked delivered`
		});
	},

	requeue: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(requeue));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });
		const result = await attempt(() =>
			db.transaction((tx) =>
				requeueDelivery(tx, form.data.id, form.data.scheduledFor || null, {
					userId: locals.user?.id
				})
			)
		);
		if (!result.ok) return message(form, { type: 'error', text: result.text }, { status: 400 });
		return message(form, {
			type: 'success',
			text: `Order #${result.value.orderId} is back in the queue`
		});
	}
};
