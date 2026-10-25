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

export const edit = z.object({
	productName: z.string().min(1, { message: 'Product Name is required.' }),
	// Amharic, optional — left blank, the public site shows the English name.
	productNameAm: z.string().max(255).optional(),
	category: z.number('Category cannot be empty. Please select a Category'),

	description: z
		.string()
		.max(500, { message: "Product description can't be more than 500 characters." })
		.optional(),
	descriptionAm: z
		.string()
		.max(1000, { message: "Amharic description can't be more than 1000 characters." })
		.optional(),
	// No `quantity`: stock only changes through the Adjust dialog, which keeps the
	// ledger. Editing it here overwrote whatever deliveries had changed since the
	// page loaded, with no record of why.

	supplier: z.coerce.number('Supplier is required').optional(),
	// `nonnegative`, not `positive`: 0 means "no reorder alert".
	reorderLevel: z.coerce
		.number()
		.int({ message: 'Reorder Level can only be full numbers, no decimals.' })
		.nonnegative({ message: 'Reorder Level cannot be negative.' })
		.default(0),

	image: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.optional()
});

/** `YYYY-MM-DD`, or empty for "not given". */
const optionalDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a full date')
	.optional()
	.or(z.literal(''));

const variantId = z.coerce.number('Pick a variant').int().positive('Pick a variant');

/**
 * Receiving (`add`) books a new batch; removing is a correction, taken from one
 * batch or, with none picked, earliest-expiry-first.
 */
export const adjust = z
	.object({
		intent: z.enum(['add', 'remove'], {
			message: 'Please select an adjustment type'
		}),
		variantId,
		quantity: z.coerce
			.number('Quantity is required')
			.int()
			.positive('Quantity must be greater than 0'),

		// add: the delivery's batch
		batchNumber: z.string().trim().max(64, 'Batch number is too long').optional(),
		manufacturedAt: optionalDate,
		expiresAt: optionalDate,
		costPerItem: z.coerce
			.number('Cost per unit must be a number')
			.min(0, 'Cost per unit cannot be negative')
			.optional(),
		// Who the stock came from. Recorded on the batch and the ledger row, so the
		// change history's supplier filter has something to filter on.
		supplier: z.coerce.number().int().nonnegative().optional(),
		reciept: z
			.instanceof(File)
			.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
			.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
			.optional(),

		// remove: 0 / absent means earliest-expiry-first
		batchId: z.coerce.number().int().nonnegative().optional(),

		employeeResponsible: z.coerce.string('Employee is required'),
		reason: z.string().max(255).optional()
	})
	.refine((d) => !d.expiresAt || !d.manufacturedAt || d.expiresAt >= d.manufacturedAt, {
		message: 'Expiry date is before the manufacture date',
		path: ['expiresAt']
	});
export type AdjustForm = typeof adjust;

export const damaged = z.object({
	variantId,
	// 0 / absent means earliest-expiry-first
	batchId: z.coerce.number().int().nonnegative().optional(),
	damagedBy: z.coerce.string('Employee is required'),
	quantity: z.coerce
		.number('Quantity is required')
		.int()
		.positive('Quantity must be greater than 0'),

	reason: z.string().max(255).optional()
});

export type DamagedForm = typeof damaged;

export const editGallery = z.object({
	existing: z.string(),
	gallery: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.array()
		.optional()
});

export type EditGallery = z.infer<typeof editGallery>;

const variantFields = {
	price: z.coerce.number('Price must be a number').positive('Price must be greater than 0'),
	amount: z.string('Product Variation is required').trim().min(1, 'Product Variation is required'),
	sku: z.string().trim().max(64, 'SKU is too long').optional(),
	// Empty means "use the product's reorder level".
	reorderLevel: z.coerce
		.number()
		.int('Reorder level can only be a whole number')
		.nonnegative('Reorder level cannot be negative')
		.optional()
		.or(z.literal(''))
};

export const editPrice = z.object({
	id: z.number('Price Not found'),
	...variantFields
});

export type EditPrice = typeof editPrice;

/** Same fields as `editPrice`, without its rules — a bad existing row must still be deletable. */
export const deletePrice = z.object({
	id: z.number('Price Not found'),
	price: z.coerce.number(),
	amount: z.string()
});

export const addPrice = z.object(variantFields);

export type AddPrice = typeof addPrice;
