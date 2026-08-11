import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, inArray } from 'drizzle-orm';
import { sendEmail, customerCheckoutTemplate, adminCheckoutTemplate } from '$lib/server/email';
import { USER } from '$env/static/private';

import { addUser, loginSchema } from '$lib/ZodSchema';
import { add } from './schema';
import { db } from '$lib/server/db';
import { orders, orderItems, customers, placeNames, prices } from '$lib/server/db/schema';
import { resolveDeliveryFee } from '$lib/server/delivery';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
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
			.where(eq(customers.userId, locals.user.id))
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

		// Actions run *before* any `load`, so a guard in a load function would only
		// affect the re-render. The check has to happen here.
		if (!locals.user) {
			return message(
				form,
				{ type: 'error', text: 'Please sign in to place an order' },
				{ status: 401 }
			);
		}

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		// `fee` and each item's `price` are deliberately *not* read out of the form —
		// they are display values the browser computed, and both are recomputed below.
		const { selectedProducts, address, deliveryAddress, saveInfo } = form.data;

		if (!selectedProducts.length) {
			return message(form, { type: 'error', text: 'Your cart is empty' });
		}

		const customer = await db
			.select({ value: customers.id, email: customers.email })
			.from(customers)
			.where(eq(customers.userId, locals.user.id))
			.limit(1)
			.then((rows) => rows[0]);

		if (!customer) {
			return message(form, { type: 'error', text: 'No customer profile found' }, { status: 403 });
		}

		let lineItems;
		try {
			lineItems = await resolveLineItems(selectedProducts);
		} catch (err) {
			console.error('Checkout: could not price the cart:', err);
			return message(form, {
				type: 'error',
				text: 'One of the items in your cart is no longer available'
			});
		}

		const subtotal = sumLineItems(lineItems);
		const fee = await resolveDeliveryFee(address, subtotal);

		if (fee === undefined) {
			return message(form, { type: 'error', text: 'We do not deliver to that area' });
		}

		const total = subtotal + Number(fee);
		let newOrderId;

		try {
			await db.transaction(async (tx) => {
				if (saveInfo) {
					await tx
						.update(customers)
						.set({ address, deliveryAddress, updatedBy: locals.user?.id })
						.where(eq(customers.id, customer.value));
				}

				const [orderId] = await tx
					.insert(orders)
					.values({
						customerId: customer.value,
						status: 'pending',
						address,
						deliveryAddress,
						fee,
						createdBy: locals.user?.id
					})
					.$returningId();
				newOrderId = orderId.id;

				await tx.insert(orderItems).values(
					lineItems.map((item) => ({
						orderId: orderId.id,
						...item,
						createdBy: locals.user?.id
					}))
				);
			});
		} catch (err) {
			console.error('Checkout: failed to place order:', err);
			return message(form, { type: 'error', text: 'Could not place your order' }, { status: 500 });
		}

		// Priced from `lineItems`, so the confirmation email can never quote a
		// figure that differs from what was written to the order.
		const emailItems = lineItems.map((item) => ({
			product: item.productId,
			quantity: item.quantity,
			amount: item.amount,
			price: Number(item.price)
		}));

		// Send to Customer — staff-created customers may have no email, so this is
		// skipped rather than sent to a null address. The admin copy still goes out.
		if (customer.email) {
			sendEmail(
				customer.email,
				customerCheckoutTemplate(newOrderId, emailItems, total).subject,
				customerCheckoutTemplate(newOrderId, emailItems, total).html
			).catch((err) => console.error('Email Error (Customer):', err));
		}

		// Send to Admin
		sendEmail(
			USER,
			adminCheckoutTemplate(newOrderId, emailItems, total).subject,
			adminCheckoutTemplate(newOrderId, emailItems, total).html
		).catch((err) => console.error('Email Error (Admin):', err));

		return message(form, { type: 'success', text: 'Order Successfully Added' });
	}
};

/**
 * Re-prices the posted cart from the `prices` table.
 *
 * The browser sends a `price` alongside every line so it can render a running
 * total, but that number is display data. Taking it at face value let a customer
 * post `price: 1` and have it written straight into `order_items`.
 *
 * Lookup is by `prices.id`. Matching on `(product_id, amount)` was wrong: that
 * pair is not unique — two variants of the same product can carry an identical
 * `amount` — so `find` returned whichever row came back first and a customer who
 * picked the cheaper package was billed for the dearer one.
 *
 * Throws if a variant doesn't exist, which rolls the caller's transaction back.
 */
async function resolveLineItems(
	selectedProducts: Array<{ priceId: number; product: number; quantity: number }>
) {
	const priceIds = [...new Set(selectedProducts.map((p) => Number(p.priceId)))];

	const variants = await db
		.select({
			id: prices.id,
			productId: prices.productId,
			amount: prices.amount,
			price: prices.price
		})
		.from(prices)
		.where(inArray(prices.id, priceIds));

	return selectedProducts.map((item) => {
		const variant = variants.find((v) => v.id === Number(item.priceId));

		if (!variant) {
			throw new Error(`No price found for variant ${item.priceId}`);
		}

		// The product is taken from the variant row too, so a payload pairing one
		// product's id with another product's variant cannot mislabel the order.
		return {
			productId: variant.productId,
			quantity: Number(item.quantity),
			amount: variant.amount,
			// `price` is a decimal column — mysql2 wants a string, and a JS number
			// would silently lose precision.
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
