import { db } from '$lib/server/db';
import { orders, customers, paymentMethods, products, orderItems } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from '../$types';
import { redirect } from '@sveltejs/kit';

import { and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return redirect(303, '/');

	try {
		const customer = await db
			.select({
				id: customers.id,
				customerName: customers.name
			})
			.from(customers)
			.where(eq(customers.userId, locals.user.id))
			.then((rows) => rows[0]);

		const orderCounts = await db
			.select({
				status: orders.status,
				count: sql<number>`count(${orders.id})`.mapWith(Number)
			})
			.from(orders)
			.where(eq(orders.customerId, Number(customer.id)))
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
				createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%Y-%m-%d')`
			})
			.from(orders)
			.leftJoin(customers, eq(orders.customerId, customers.id))
			.where(eq(orders.customerId, Number(customer.id)));

		const allItems = await db
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
			.leftJoin(
				orders,
				and(
					eq(orders.id, orderItems.orderId),
					eq(orders.status, 'pending'),
					eq(orders.customerId, Number(customer.id))
				)
			)
			.leftJoin(products, eq(orderItems.productId, products.id));

		return {
			customer,
			allMethods,
			allData,
			allItems,
			orderCounts
		};
	} catch (error) {
		console.error('Error loading customer dashboard:', error);
		return {
			customer: null,
			form: null,
			allMethods: [],
			reciepts: [],
			error: 'Failed to load customer dashboard.'
		};
	}
};

// export const actions: Actions = {
// 	editCustomer: async ({ request, locals, cookies }) => {
// 		const form = await superValidate(request, zod4(editCustomer));

// 		if (!form.valid) {
// 			// Stay on the same page and set a flash message
// 			setFlash({ type: 'error', message: 'Please check your form.' }, cookies);
// 			return fail(400, { form });
// 		}
// 		const { firstName, lastName, gender, phone, customerId } = form.data;

// 		try {
// 			await db
// 				.update(customers)
// 				.set({
// 					firstName,
// 					lastName,
// 					gender: gender === 'male' || gender === 'female' ? gender : undefined,
// 					phone,
// 					updatedBy: locals?.user?.id
// 				})
// 				.where(eq(customers.id, customerId));

// 			// Stay on the same page and set a flash message
// 			setFlash({ type: 'success', message: 'Customer updated Successfully Added' }, cookies);
// 			return message(form, { type: 'success', text: 'Customer updated Successfully Added' });
// 		} catch (err) {
// 			console.error('Error' + err);
// 			setFlash({ type: 'error', message: 'Error: Something Went Wrong Try Again' }, cookies);

// 			return message(form, { type: 'error', text: 'Error: Something Went Wrong Try Again' });
// 		}
// 	},
// 	delete: async ({ cookies, params }) => {
// 		const { id } = params;

// 		try {
// 			if (!id) {
// 				setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
// 				return fail(400);
// 			}

// 			await db.delete(customers).where(eq(customers.id, id));

// 			setFlash({ type: 'success', message: 'Customer Deleted Successfully!' }, cookies);
// 			return message(form, {
// 				type: 'success',
// 				text: 'Customer Deleted Successfully!'
// 			});
// 		} catch (err) {
// 			console.error('Error deleting customer:', err);
// 			setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
// 			return fail(400);
// 		}
// 	}
// };
