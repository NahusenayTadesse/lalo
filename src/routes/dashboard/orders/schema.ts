import { z } from 'zod/v4';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 5MB limit
const ACCEPTED_FILE_TYPES = [
	'image/jpeg', // Common for both platforms
	'image/png', // Common for both platforms (and screenshots)
	'image/webp', // Common modern format (often Android screenshots/exports)
	'image/heic', // High Efficiency Image File (iOS default)
	'image/heif', // High Efficiency Image File (related to HEIC)
	'application/pdf' // Document format, kept from original
];

/**
 * One row of the order builder. `amount` is the "<price> <package label>" string
 * the price combobox produces (see splitNumbers() in +page.server.ts); an empty
 * one means the row was added but never filled in, which used to sail through
 * validation and write a NaN price.
 */
const lineItems = z
	.object({
		product: z.number({ message: 'Product is required' }).int().positive('Product is required'),
		quantity: z.number().int().positive('Number of products must be at least 1'),
		amount: z.string('Package size is required').min(1, 'Package size is required')
	})
	.array()
	.min(1, 'An order needs at least one product');

/** Delivery area, matched against `place_names` server-side to price the order. */
const address = z.string().max(100, 'Address is too long').optional().or(z.literal(''));
/** Free-text street address. Carries no fee. */
const deliveryAddress = z
	.string()
	.max(255, 'Delivery address is too long')
	.optional()
	.or(z.literal(''));

export const add = z.object({
	customer: z.coerce.number('Customer is required'),
	selectedProducts: lineItems,
	address,
	deliveryAddress,
	// No 'delivered' here on purpose: orders are delivered from the deliveries
	// page, which moves the stock and records who took it and who received it.
	status: z.enum(['pending', 'cancelled'], { message: 'Status is required' }).default('pending')
});

export const edit = z.object({
	id: z.coerce.number(),
	customer: z.coerce.number('Customer is required'),
	selectedProducts: lineItems,
	address,
	deliveryAddress,
	// 'delivered' only so a delivered order's own status round-trips; the action
	// refuses it for any other order.
	status: z
		.enum(['pending', 'delivered', 'cancelled'], { message: 'Status is required' })
		.default('pending'),
	reciept: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.optional(),
	paymentMethod: z.number().optional(),
	// Staff have checked the money arrived. Confirming it queues the order for delivery.
	paymentConfirmed: z.boolean().default(false)
	// `fee` is deliberately absent: it is derived from `address` and the order
	// subtotal, and recomputed server-side on every save.
});
export type Edit = z.infer<typeof edit>;
export type Add = z.infer<typeof add>;
