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

export const paymentMethod = z.object({
	name: z.string('Name of Payment Method is required').min(2).max(50),
	position: z.string().optional(),
	testimonial: z.string(),
	avatar: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
});

export const editPaymentMethod = z.object({
	id: z.coerce.number(),
	name: z.string('Name of Payment Method is required').min(2).max(50),
	position: z.string().optional(),
	testimonial: z.string(),
	avatar: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
});

export type EditPaymentMethod = z.infer<typeof editPaymentMethod>;

export const deleteTestimonial = z.object({
	id: z.coerce.number()
});

export type DeleteTestimonial = z.infer<typeof deleteTestimonial>;
