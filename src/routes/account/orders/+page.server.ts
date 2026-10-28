import { m } from '$lib/paraglide/messages.js';
import { error, fail, isHttpError, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { localized } from '$lib/server/localize';
import { db } from '$lib/server/db';
import {
	orders,
	customers,
	orderItems,
	products,
	transactions,
	deliveries
} from '$lib/server/db/schema';
import { DeliveryError, inAddis, markDelivered, sendDeliveredMail } from '$lib/server/deliveries';
import { eq, and, or, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// 1. Guard check
	if (!locals.user) return redirect(303, '/');

	try {
		// 2. Fetch the logged-in customer's ID
		const customer = await db
			.select({ id: customers.id })
			.from(customers)
			.where(eq(customers.userId, locals.user.id))
			.then((rows) => rows[0]);

		if (!customer) {
			throw error(404, m.acc_profile_not_found());
		}

		// 3. Fetch ONLY pending orders along with an aggregated array of items
		// Using a subquery or structured map to prevent item array layout fragmentation
		const rawPendingOrders = await db
			.select({
				id: orders.id,
				status: orders.status,
				createdAt: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d %H:%i')`,
				updatedAt: sql<string>`DATE_FORMAT(${orders.updatedAt}, '%Y-%m-%d %H:%i')`,
				fee: orders.fee,
				paymentStatus: transactions.paymentStatus,
				deliveryStatus: deliveries.status,
				method: deliveries.method,
				scheduledFor: inAddis(deliveries.scheduledFor),
				dispatchedAt: inAddis(deliveries.dispatchedAt),
				deliveredAt: inAddis(deliveries.deliveredAt),
				driverName: deliveries.driverName,
				driverPhone: deliveries.driverPhone,
				vehicle: sql<
					string | null
				>`NULLIF(CONCAT_WS(' · ', ${deliveries.vehicleType}, ${deliveries.vehiclePlate}), '')`,
				cashToCollect: deliveries.cashToCollect,
				confirmedVia: deliveries.confirmedVia,
				// Example tracking steps field if you have it, otherwise mock calculated on frontend
				itemId: orderItems.id,
				productName: localized(products.name, products.nameAm),
				quantity: orderItems.quantity,
				price: orderItems.price,
				total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number)
			})
			.from(orders)
			.leftJoin(transactions, eq(orders.transactionId, transactions.id))
			.leftJoin(deliveries, eq(deliveries.orderId, orders.id))
			.leftJoin(orderItems, eq(orders.id, orderItems.orderId))
			.leftJoin(products, eq(orderItems.productId, products.id))
			.where(
				and(
					eq(orders.customerId, Number(customer.id)),
					// Open orders, and ones delivered in the last two weeks so the
					// customer can still see when theirs arrived.
					or(
						eq(orders.status, 'pending'),
						and(
							eq(orders.status, 'delivered'),
							sql`${orders.deliveredAt} >= NOW() - INTERVAL 14 DAY`
						)
					)
				)
			)
			.orderBy(sql`${orders.status} = 'delivered'`, sql`${orders.id} DESC`);

		// 4. Reduce flat rows into structured Order objects with child Items
		const pendingOrdersMap = rawPendingOrders.reduce(
			(acc, row) => {
				if (!acc[row.id]) {
					acc[row.id] = {
						id: row.id,
						status: row.status,
						createdAt: row.createdAt,
						updatedAt: row.updatedAt,
						// Starts at the delivery fee: "Estimated Expenditure" quoted items only,
						// so customers who chose delivery were shown less than they'd pay.
						orderTotal: Number(row.fee ?? 0),
						delivery: {
							status: row.deliveryStatus,
							pickup: row.method === 'pickup',
							scheduledFor: row.scheduledFor,
							dispatchedAt: row.dispatchedAt,
							deliveredAt: row.deliveredAt,
							driverName: row.driverName,
							driverPhone: row.driverPhone,
							vehicle: row.vehicle,
							cashToCollect: row.paymentStatus === 'paid' ? null : row.cashToCollect,
							confirmedByCustomer: row.confirmedVia === 'customer'
						},
						items: []
					};
				}

				if (row.itemId) {
					acc[row.id].items.push({
						id: row.itemId,
						productName: row.productName,
						quantity: row.quantity,
						price: row.price,
						total: row.total
					});
					acc[row.id].orderTotal += row.total;
				}

				return acc;
			},
			{} as Record<number, any>
		);

		return {
			// Open orders first, newest first; recently delivered ones after them.
			pendingOrders: Object.values(pendingOrdersMap).sort(
				(a, b) => Number(a.status === 'delivered') - Number(b.status === 'delivered') || b.id - a.id
			)
		};
	} catch (err) {
		// The 404 above used to be swallowed here and shown as "no active shipments".
		if (isHttpError(err)) throw err;
		console.error('Error loading order tracking snapshot:', err);
		return {
			pendingOrders: [],
			error: m.acc_tracking_failed()
		};
	}
};

export const actions: Actions = {
	/**
	 * The customer says their order arrived. Only for their own order while it is
	 * out for delivery; staff can reopen it if that turns out to be wrong.
	 */
	confirmReceived: async ({ request, locals }) => {
		if (!locals.user) redirect(303, '/login');

		const orderId = Number((await request.formData()).get('orderId'));
		const delivery = await db
			.select({ id: deliveries.id })
			.from(deliveries)
			.innerJoin(orders, eq(orders.id, deliveries.orderId))
			.innerJoin(customers, eq(orders.customerId, customers.id))
			.where(
				and(
					eq(orders.id, orderId),
					eq(customers.userId, locals.user.id),
					eq(deliveries.status, 'dispatched')
				)
			)
			.then((rows) => rows[0]);
		if (!delivery) return fail(404, { message: 'Order not found' });

		try {
			await db.transaction((tx) =>
				markDelivered(tx, delivery.id, {}, { userId: locals.user!.id, byCustomer: true })
			);
		} catch (err) {
			if (err instanceof DeliveryError) return fail(409, { message: err.message });
			console.error(`Customer could not confirm order #${orderId}:`, err);
			return fail(500, { message: 'Could not save that. Please try again.' });
		}
		sendDeliveredMail(orderId);
		return { received: orderId };
	}
};
