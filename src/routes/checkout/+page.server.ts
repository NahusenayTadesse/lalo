import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, and, inArray } from 'drizzle-orm';
import { sendEmail, customerCheckoutTemplate, adminCheckoutTemplate } from '$lib/server/email';
import { USER } from '$env/static/private';

// The signup dialog on this page posts to `/signup?/signup`, so it must be
// seeded with the same schema that action validates against — see `addUser`.
import { addUser as signupSchema, loginSchema } from '$lib/ZodSchema';
import { addGuest } from './schema';
import { PICKUP_LABEL } from '$lib/delivery';
import { db } from '$lib/server/db';
import { orders, orderItems, customers, placeNames, prices } from '$lib/server/db/schema';
import { resolveDeliveryFee } from '$lib/server/delivery';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const signupForm = await superValidate(zod4(signupSchema));
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

	const form = await superValidate(zod4(addGuest));

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
		const form = await superValidate(request, zod4(addGuest));

		// Guest-ness is decided by the session, never by the posted `guest` flag —
		// that field only drives which fields the browser validates.
		const isGuest = !locals.user;
		form.data.guest = isGuest;

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		// `fee` and each item's `price` are deliberately *not* read out of the form —
		// they are display values the browser computed, and both are recomputed below.
		const { selectedProducts, saveInfo, pickup } = form.data;

		// A pickup order has no delivery area, so nothing is looked up in
		// `place_names` and nothing is charged. The two address columns are stamped
		// with `PICKUP_LABEL` rather than left empty so an order in the dashboard
		// reads as a collection rather than as one missing its address.
		const address = pickup ? PICKUP_LABEL : (form.data.address ?? '');
		const deliveryAddress = pickup ? PICKUP_LABEL : (form.data.deliveryAddress ?? '');

		if (!selectedProducts.length) {
			return message(form, { type: 'error', text: 'Your cart is empty' });
		}

		// A guest's contact details are validated here but the `customers` row is
		// only written further down, once the cart and the delivery area have both
		// been accepted. Creating it up front left an orphan customer behind every
		// time an order was then rejected.
		let guestDetails: { name: string; email: string; phone: string } | undefined;

		if (isGuest) {
			// The posted `guest` flag may have said "false" while there is no session,
			// in which case `addGuest` skipped the contact-detail checks. Re-run them
			// here so a hand-rolled POST can't create an unreachable order.
			const name = form.data.guestName?.trim() ?? '';
			const email = form.data.guestEmail?.trim().toLowerCase() ?? '';
			const phone = form.data.guestPhone?.trim() ?? '';

			if (name.length < 2) return setError(form, 'guestName', 'Your name is required');
			if (!email) return setError(form, 'guestEmail', 'A valid email is required');
			if (phone.length < 10) return setError(form, 'guestPhone', 'A valid phone is required');

			guestDetails = { name, email, phone };
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
		// A pickup order passes `PICKUP_LABEL` as the area and comes back at 0.00 —
		// zeroed server-side, for the same reason the fee is always resolved here:
		// the `fee` the browser posted is display data and is never trusted.
		const fee = await resolveDeliveryFee(address, subtotal);

		if (fee === undefined) {
			return message(form, { type: 'error', text: 'We do not deliver to that area' });
		}

		let customer: { value: number; email: string | null } | undefined;

		if (guestDetails) {
			try {
				customer = await findOrCreateGuestCustomer({
					...guestDetails,
					address,
					deliveryAddress
				});
			} catch (err) {
				console.error('Checkout: could not create a guest customer:', err);
				return message(
					form,
					{ type: 'error', text: 'Could not save your details. Please try again.' },
					{ status: 500 }
				);
			}
		} else {
			customer = await db
				.select({ value: customers.id, email: customers.email })
				.from(customers)
				.where(eq(customers.userId, locals.user!.id))
				.limit(1)
				.then((rows) => rows[0]);
		}

		if (!customer) {
			return message(form, { type: 'error', text: 'No customer profile found' }, { status: 403 });
		}

		const total = subtotal + Number(fee);
		let newOrderId;

		try {
			await db.transaction(async (tx) => {
				// Guests have nothing to save back to — their row was just written with
				// exactly these values, and it isn't a profile they can return to.
				// Never on a pickup order: `address` is the `PICKUP_LABEL` placeholder
				// there, and writing it back would wipe the delivery area the customer
				// had saved and leave the next order unable to quote a fee.
				if (saveInfo && !isGuest && !pickup) {
					await tx
						.update(customers)
						.set({ address, deliveryAddress, updatedBy: locals.user?.id })
						.where(eq(customers.id, customer!.value));
				}

				const [orderId] = await tx
					.insert(orders)
					.values({
						customerId: customer!.value,
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
 * Resolves the `customers` row an account-less order should hang off.
 *
 * The row is written with `user_id` NULL — a guest is a standalone customer,
 * exactly like a walk-in added from the dashboard, and no `user` account is
 * created or linked. (This needs `customers.user_id` and `customers.email` to
 * be nullable in the database; see `drizzle/0019_*.sql`.)
 *
 * `customers.email` is UNIQUE, so a returning guest — or someone who already
 * has an account — would collide on insert. Their existing row is reused
 * instead, and deliberately left untouched: the address and phone they typed
 * are recorded on the order itself, and silently rewriting the stored profile
 * of a registered customer from an unauthenticated form would be a way to
 * tamper with someone else's account.
 */
async function findOrCreateGuestCustomer(details: {
	name: string;
	email: string;
	phone: string;
	address: string;
	deliveryAddress: string;
}) {
	const existing = await db
		.select({ value: customers.id, email: customers.email })
		.from(customers)
		.where(eq(customers.email, details.email))
		.limit(1)
		.then((rows) => rows[0]);

	if (existing) return existing;

	const [inserted] = await db
		.insert(customers)
		.values({
			name: details.name,
			email: details.email,
			phone: details.phone,
			address: details.address,
			deliveryAddress: details.deliveryAddress
		})
		.$returningId();

	return { value: inserted.id, email: details.email };
}

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
