import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql } from 'drizzle-orm';
import { sendEmail, customerCheckoutTemplate, adminCheckoutTemplate } from '$lib/server/email';
import { USER } from '$env/static/private';

import { addUser, loginSchema } from '$lib/ZodSchema';
import { add } from './schema';
import { db } from '$lib/server/db';
import { orders, orderItems, products, customers, placeNames } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ( { locals }) => {

	const signupForm = await superValidate(zod4(addUser));
	const loginForm = await superValidate(zod4(loginSchema));
	const placeList = await db
		.select({
			value: placeNames.name,
			name: placeNames.name,
			fee: placeNames.fee
		})
		.from(placeNames)
		.where(eq(placeNames.isActive, true));

	let customerInfo;
	if (locals?.user) {
		customerInfo = await db
			.select({
				id: customers.id,
				name: customers.name,
				phone: customers.phone,
				email: customers.email,
				address: customers.address,
				deliveryAddress: customers.deliveryAddress
			})
			.from(customers)
			.leftJoin(orders, eq(customers.id, orders.customerId))
			.where(eq(customers.userId, locals?.user?.id))
			.limit(1)
			.then((rows) => rows[0]);
	}

		const form = await superValidate(zod4(add));

	return {
		form,
		signupForm,
		loginForm,
		placeList,
		customerInfo
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));
		console.log(form.data);
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { selectedProducts, address, deliveryAddress, fee, saveInfo } = form.data;
		let customerInfo;
		let newOrderId;

		try {
			await db.transaction(async (tx) => {
				const [customer] = await tx
					.select({ value: customers.id, email: customers.email })
					.from(customers)
					.where(eq(customers.userId, locals?.user?.id))
					.limit(1)
				customerInfo = customer;
				if (saveInfo) {
					await tx
						.update(customers)
						.set({ address, deliveryAddress })
						.where(eq(customers.id, customer.value));
				}

				const [orderId] = await tx
					.insert(orders)
					.values({ customerId: customer.value, status: 'pending', address, deliveryAddress, fee })
					.$returningId();
				newOrderId = orderId.id;

				if (selectedProducts.length) {
					await tx.insert(orderItems).values(
						selectedProducts.map((product) => ({
							orderId: orderId.id,
							productId: Number(product.product),
							amount: product.amount,
							quantity: Number(product.quantity),
							price: Number(product.price)
						}))
					);
				}
			});

			const total = selectedProducts.reduce((acc, p) => acc + p.price * p.quantity, 0);

			// Send to Customer
			sendEmail(
				customerInfo?.email,
				customerCheckoutTemplate(newOrderId, selectedProducts, total).subject,
				customerCheckoutTemplate(newOrderId, selectedProducts, total).html
			).catch((err) => console.error('Email Error (Customer):', err));

			// Send to Admin
			sendEmail(
				USER,
				adminCheckoutTemplate(newOrderId, selectedProducts, total).subject,
				adminCheckoutTemplate(newOrderId, selectedProducts, total).html
			).catch((err) => console.error('Email Error (Admin):', err));

			return message(form, { type: 'success', text: 'Order Successfully Added' });
		} catch (err) {
			return message(form, {
				type: 'error',
				text: 'Error Adding Orders: ' + err?.message
			});
		}
	}
};

function getPrice(list: Array<{ value: number; price: string }>, value: number): number {
	const item = list.find((i) => i.value === value);
	return item ? Number(item.price) : 0;
}
