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
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from '../$types';
import { superValidate } from 'sveltekit-superforms';
import { type Actions } from '@sveltejs/kit';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';
import { and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
	try {
		const { id } = params;

		const form = await superValidate(zod4(edit));

		const customer = await db
			.select({
				id: customers.id,
				customerName: customers.name,
				phone: customers.phone,
				email: customers.email,
				address: customers.address,
				status: customers.isActive,
				daysSinceJoined: sql<number>`DATEDIFF(CURRENT_DATE, ${customers.createdAt})`,
				createdBy: user.name,
				createdById: user.id,
				createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%Y-%m-%d')`
			})
			.from(customers)
			.leftJoin(user, eq(customers.createdBy, user.id))
			.then((rows) => rows[0]);

		const orderCounts = await db
			.select({
				status: orders.status,
				count: sql<number>`count(${orders.id})`.mapWith(Number)
			})
			.from(orders)
			.where(eq(orders.customerId, Number(id)))
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
			.where(and(eq(orders.status, 'pending'), eq(orders.customerId, Number(id))));

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
					eq(orders.customerId, Number(id))
				)
			)
			.leftJoin(products, eq(orderItems.productId, products.id));

		return {
			customer,
			form,
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

export const actions: Actions = {
	edit: async ({ request, locals, cookies, params }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form.' }, cookies);
			return fail(400, { form });
		}
		const { name, phone, email, status, address } = form.data;

		try {
			await db.transaction(async (tx) => {
				await tx
					.update(customers)
					.set({
						name,
						email,
						phone,
						address,
						isActive: status,
						updatedBy: locals?.user?.id
					})
					.where(eq(customers.id, Number(id)));

				const userId = await db
					.select({ id: customers.userId })
					.from(customers)
					.where(eq(customers.id, Number(id)))
					.then((rows) => rows[0]);

				await tx.update(user).set({ email }).where(eq(user.id, userId.id));
			});
			// Stay on the same page and set a flash message
			return message(form, { type: 'success', text: 'Customer updated Successfully Added' });
		} catch (err) {
			console.error('Error' + err);
			setFlash({ type: 'error', message: 'Error: Something Went Wrong Try Again' }, cookies);

			return message(form, { type: 'error', text: 'Error: Something Went Wrong Try Again' });
		}
	},
	delete: async ({ cookies, params }) => {
		const { id } = params;

		try {
			if (!id) {
				setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
				return fail(400);
			}

			await db.delete(customers).where(eq(customers.id, id));

			setFlash({ type: 'success', message: 'Customer Deleted Successfully!' }, cookies);
			return message(form, {
				type: 'success',
				text: 'Customer Deleted Successfully!'
			});
		} catch (err) {
			console.error('Error deleting customer:', err);
			setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
			return fail(400);
		}
	}
};
