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
	address: z.string('Address is required').min(1, 'Please choose a delivery area').max(100),
	deliveryAddress: z.string('Delivery Address is required').min(5).max(200),
	// Display only, same as `price` above — the server computes the real fee from
	// `place_names`. Optional and non-negative because a free-delivery order shows
	// 0, which the previous `.positive()` rejected outright.
	fee: z.number().nonnegative().optional(),
	saveInfo: z.boolean().default(false)
});
