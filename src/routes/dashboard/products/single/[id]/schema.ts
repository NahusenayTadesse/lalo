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
	price: z
		.number({ message: 'Price is required' })
		.positive({ message: 'Price must be a positive number.' }),

	supplier: z.coerce.number('Supplier is required'),
	reorderLevel: z.coerce
		.number()
		.int({ message: 'Reorder Level can only be full numbers, no decimals.' })
		.positive({ message: 'Reorder Level must be a positive number.' })
		.default(0),

	image: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
});

export const adjust = z.object({
	intent: z.enum(['add', 'remove'], {
		message: 'Please select an adjustment type'
	}),

	costPerItem: z.coerce
		.number('Cost per unit must be a number')
		.min(0, 'Cost per unit must be greater than 0'),

	employeeResponsible: z.coerce.string('Employee is required'),
	quantity: z.coerce.string('Quantity must be greater than 0'),

	reason: z.string().max(255).optional(),
	reciept: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.optional()
});
export type AdjustForm = z.infer<typeof adjust>;

export const damaged = z.object({
	damagedBy: z.coerce.string('Employee is required'),
	quantity: z.coerce.string('Quantity must be greater than 0'),

	reason: z.string().max(255).optional()
});

export type DamagedForm = z.infer<typeof damaged>;

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
