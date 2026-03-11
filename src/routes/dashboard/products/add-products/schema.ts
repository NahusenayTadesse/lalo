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

export const add = z.object({
	productName: z.string().min(1, { message: 'Product Name is required.' }),
	category: z.number('Category cannot be empty. Please select a Category'),

	description: z
		.string()
		.max(500, { message: "Product description can't be more than 500 characters." })
		.optional(),
	quantity: z.coerce
		.number()
		.int({ message: 'Quantity can only be full numbers, no decimals.' })
		.positive({ message: 'Quantity must be a positive number.' })
		.default(0),
	prices: z
		.object({
			price: z.number('Prices are required.'),
			amount: z.string('Variation Name is required.')
		})
		.array()
		.min(1, { message: 'Prices are required.' }),

	supplier: z.coerce.number('Supplier is required'),
	reorderLevel: z.coerce
		.number()
		.int({ message: 'Reorder Level can only be full numbers, no decimals.' })
		.positive({ message: 'Reorder Level must be a positive number.' })
		.default(0),

	image: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.'),
	gallery: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.array()
		.optional()
});
