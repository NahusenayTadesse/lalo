import { z } from 'zod/v4';

export const add = z.object({
	selectedProducts: z
		.object({
			// `prices.id`. This is what identifies the variant — `amount` is not
			// unique within a product, so it cannot be used to look one up.
			priceId: z.number({ message: 'Variation is required' }).int().positive(),
			// Display only. The server re-reads both from `prices` and ignores these.
			amount: z.string({ message: 'Variation is required' }),
			price: z.number({ message: 'Price is required' }).positive('Price is required'),
			product: z.number({ message: 'Product is required' }).int().positive('Product is required'),
			quantity: z.number().int().positive('Number of products must be at least 1')
		})
		.array(),
	// The name of a delivery area, chosen from a `<select>` of `place_names`, not
	// free text — a minimum length is the wrong rule for it. `min(5)` rejected
	// "Bole", a real 4-character area, so nobody living there could check out at
	// all. Whether the area actually exists is settled server-side against
	// `place_names`, which is the check that matters.
	//
	// Both are optional here rather than required, because a local-pickup order
	// has nowhere to deliver to. The requirement is re-imposed in `addGuest`
	// whenever `pickup` is false — see the refinement below.
	address: z.string().max(100).optional(),
	deliveryAddress: z.string().max(200).optional(),
	// Display only, same as `price` above — the server computes the real fee from
	// `place_names`. Optional and non-negative because a free-delivery order shows
	// 0, which the previous `.positive()` rejected outright.
	fee: z.number().nonnegative().optional(),
	saveInfo: z.boolean().default(false),

	// --- Local pickup -----------------------------------------------------
	// The customer collects the order from the shop, so no area is chosen and
	// no fee is charged. Like `guest`, this is only a validation switch for the
	// address fields; the action zeroes the fee itself rather than believing
	// whatever `fee` the browser posted.
	pickup: z.boolean().default(false),

	// --- Guest checkout ---------------------------------------------------
	// Someone without an account can still order: they type their details here
	// and the action creates an account-less `customers` row (`user_id` NULL).
	//
	// `guest` is only a *validation* switch — it decides whether the three
	// fields below are required. It is never trusted for authorisation: the
	// action re-derives guest-ness from `locals.user` and re-checks the fields,
	// so posting `guest: false` with no session cannot slip an order through
	// without contact details.
	guest: z.boolean().default(false),
	guestName: z.string().max(100).optional(),
	guestEmail: z.string().max(100).optional(),
	guestPhone: z.string().max(15).optional()
});

/**
 * The conditional fields: guest contact details, checked only when the form says
 * it is a guest checkout, and the delivery address, checked only when the order
 * is not being picked up in person.
 *
 * Kept as a separate refinement on top of `add` so the plain object schema
 * stays usable server-side (where `locals.user` is the real signal) while the
 * browser still gets per-field errors instead of one opaque "check the form".
 */
export const addGuest = add.superRefine((data, ctx) => {
	if (!data.pickup) {
		if (!data.address || data.address.trim().length < 1) {
			ctx.addIssue({ code: 'custom', path: ['address'], message: 'Please choose a delivery area' });
		}
		if (!data.deliveryAddress || data.deliveryAddress.trim().length < 5) {
			ctx.addIssue({
				code: 'custom',
				path: ['deliveryAddress'],
				message: 'Delivery Address is required'
			});
		}
	}

	if (!data.guest) return;

	if (!data.guestName || data.guestName.trim().length < 2) {
		ctx.addIssue({ code: 'custom', path: ['guestName'], message: 'Your name is required' });
	}
	if (!data.guestEmail || !z.email().safeParse(data.guestEmail).success) {
		ctx.addIssue({ code: 'custom', path: ['guestEmail'], message: 'A valid email is required' });
	}
	if (!data.guestPhone || data.guestPhone.trim().length < 10) {
		ctx.addIssue({ code: 'custom', path: ['guestPhone'], message: 'A valid phone is required' });
	}
});
