import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, sql } from 'drizzle-orm';
import { sendEmail, customerCheckoutTemplate, adminCheckoutTemplate } from '$lib/server/email';
import { USER } from '$env/static/private';

import { addUser, loginSchema } from '$lib/ZodSchema';
import { add } from './schema';
import { db } from '$lib/server/db';
import { orders, orderItems, products, customers } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const signupForm = await superValidate(zod4(addUser));
	const loginForm = await superValidate(zod4(loginSchema));

	return {
		form,
		signupForm,
		loginForm
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));
		console.log(form.data);
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { selectedProducts } = form.data;
		let customerInfo;
		let newOrderId;

		try {
			await db.transaction(async (tx) => {
				const customer = await tx
					.select({ value: customers.id, email: customers.email })
					.from(customers)
					.where(eq(customers.userId, locals?.user?.id))
					.then((rows) => rows[0]);
				customerInfo = customer;

				const [orderId] = await tx
					.insert(orders)
					.values({ customerId: customer.value, status: 'pending' })
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
