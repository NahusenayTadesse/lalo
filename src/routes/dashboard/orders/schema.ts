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
	customer: z.coerce.number('Customer is required'),
	selectedProducts: z
		.object({
			product: z.number({ message: 'Product is required' }).int().positive('Product is required'),
			quantity: z.number().int().positive('Number of products must be at least 1'),
			amount: z.string('Amount is required')
		})
		.array(),

	status: z
		.enum(['pending', 'delivered', 'cancelled'], { message: 'Status is required' })
		.default('pending')
});

export const edit = z.object({
	id: z.coerce.number(),
	customer: z.coerce.number('Customer is required'),
	selectedProducts: z
		.object({
			product: z.number({ message: 'Product is required' }).int().positive('Product is required'),
			quantity: z.number().int().positive('Number of products must be at least 1'),
			amount: z.string('Amount is required')
		})
		.array(),

	status: z
		.enum(['pending', 'delivered', 'cancelled'], { message: 'Status is required' })
		.default('pending'),
	reciept: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.optional(),
	paymentMethod: z.number().optional()
});
export type Edit = z.infer<typeof edit>;
