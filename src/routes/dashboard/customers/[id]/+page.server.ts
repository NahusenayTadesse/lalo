import { zod4 } from 'sveltekit-superforms/adapters';
import { edit } from './schema.js';
import { db } from '$lib/server/db';
import {
	orders,
	customers,
	paymentMethods,
	user,
	products,
	orderItems
} from '$lib/server/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { error, isHttpError } from '@sveltejs/kit';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';
import { duplicateField } from '$lib/server/crud';
import { normalizeEthiopianPhone } from '$lib/validators/phone';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const id = Number(params.id);

		const form = await superValidate(zod4(edit));

		const customer = await db
			.select({
				id: customers.id,
				customerName: customers.name,
				phone: customers.phone,
				email: customers.email,
				address: customers.address,
				deliveryAddress: customers.deliveryAddress,
				status: customers.isActive,
				daysSinceJoined: sql<number>`DATEDIFF(CURRENT_DATE, ${customers.createdAt})`,
				createdBy: user.name,
				createdById: user.id,
				createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%Y-%m-%d')`
			})
			.from(customers)
			.leftJoin(user, eq(customers.createdBy, user.id))
			.where(eq(customers.id, id))
			.then((rows) => rows[0]);

		if (!customer) error(404, 'Customer not found');

		const orderCounts = await db
			.select({
				status: orders.status,
				count: sql<number>`count(${orders.id})`.mapWith(Number)
			})
			.from(orders)
			.where(eq(orders.customerId, id))
			.groupBy(orders.status);

		const allMethods = await db
			.select({
				value: paymentMethods.id,
				name: paymentMethods.name,
				description: paymentMethods.description
			})
			.from(paymentMethods)
			.where(eq(paymentMethods.isActive, true));

		const allData = await db
			.select({
				id: orders.id,
				name: customers.name,
				status: orders.status,
				createdAt: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d')`
			})
			.from(orders)
			.leftJoin(customers, eq(orders.customerId, customers.id))
			.where(and(eq(orders.status, 'pending'), eq(orders.customerId, id)));

		// Only the items of the orders listed above. A condition inside a LEFT JOIN
		// filters nothing, which loaded the whole order-items table on every visit.
		const orderIds = allData.map((order) => order.id);
		const allItems = orderIds.length
			? await db
					.select({
						id: orderItems.id,
						orderId: orderItems.orderId,
						product: products.name,
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
			customer,
			form,
			allMethods,
			allData,
			allItems,
			orderCounts
		};
	} catch (err) {
		// Let the 404 above through instead of rendering an empty page.
		if (isHttpError(err)) throw err;
		console.error('Error loading customer dashboard:', err);
		return {
			customer: null,
			form: null,
			allMethods: [],
			reciepts: [],
			error: 'Failed to load customer dashboard.'
		};
	}
};

export const actions: Actions = {
	edit: async ({ request, locals, cookies, params }) => {
		const id = Number(params.id);
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			setFlash({ type: 'error', message: 'Please check your form.' }, cookies);
			return fail(400, { form });
		}
		const { name, status } = form.data;
		const phone = normalizeEthiopianPhone(form.data.phone) ?? form.data.phone.trim();

		try {
			// Only the `customers` row. A linked login's email belongs to better-auth and
			// changes through its own verified flow, not from here.
			const [result] = await db
				.update(customers)
				.set({
					name,
					phone,
					// NULL, never '': `email` is UNIQUE and MySQL allows repeated NULLs only.
					email: form.data.email || null,
					address: form.data.address || null,
					deliveryAddress: form.data.deliveryAddress || null,
					isActive: status,
					updatedBy: locals?.user?.id
				})
				.where(eq(customers.id, id));

			if (result.affectedRows === 0) {
				return message(form, { type: 'error', text: 'Customer not found' }, { status: 404 });
			}

			return message(form, { type: 'success', text: 'Customer updated successfully' });
		} catch (err) {
			if (duplicateField(err, customers) === 'email') {
				return message(
					form,
					{ type: 'error', text: 'Another customer already uses this email' },
					{ status: 400 }
				);
			}
			console.error('Error updating customer:', err);
			return message(
				form,
				{ type: 'error', text: 'Error: Something Went Wrong Try Again' },
				{ status: 500 }
			);
		}
	},
	delete: async ({ cookies, params }) => {
		const id = Number(params.id);

		try {
			await db.delete(customers).where(eq(customers.id, id));
		} catch (err) {
			// `orders.customer_id` has no ON DELETE rule, and an order's history must not
			// silently disappear with its customer.
			if ((err as { code?: string })?.code === 'ER_ROW_IS_REFERENCED_2') {
				setFlash(
					{
						type: 'error',
						message: 'This customer has orders and cannot be deleted. Mark them Inactive instead.'
					},
					cookies
				);
				return fail(400);
			}
			console.error('Error deleting customer:', err);
			setFlash({ type: 'error', message: 'Could not delete this customer.' }, cookies);
			return fail(500);
		}

		setFlash({ type: 'success', message: 'Customer Deleted Successfully!' }, cookies);
	}
};
