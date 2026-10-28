import { z } from 'zod/v4';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const ACCEPTED_FILE_TYPES = [
	'image/jpeg', // Common for both platforms
	'image/png', // Common for both platforms (and screenshots)
	'image/webp', // Common modern format (often Android screenshots/exports)
	'image/heic', // High Efficiency Image File (iOS default)
	'image/heif' // High Efficiency Image File (related to HEIC)
];

const avatarFile = z
	.instanceof(File)
	.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
	.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Please upload an image.');

export const paymentMethod = z.object({
	name: z.string('Name is required').min(2).max(50),
	position: z.string().optional(),
	testimonial: z.string(),
	// Amharic, optional — left blank, the public site shows the English text.
	positionAm: z.string().max(255).optional(),
	testimonialAm: z.string().optional(),
	avatar: avatarFile
});

export const editPaymentMethod = z.object({
	id: z.coerce.number(),
	name: z.string('Name is required').min(2).max(50),
	position: z.string().optional(),
	testimonial: z.string(),
	// Amharic, optional — left blank, the public site shows the English text.
	positionAm: z.string().max(255).optional(),
	testimonialAm: z.string().optional(),
	// Optional: fixing a typo shouldn't mean uploading the photo again. An empty
	// file input is skipped here and keeps the current avatar.
	avatar: z
		.instanceof(File)
		.refine((file) => file.size === 0 || file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine(
			(file) => file.size === 0 || ACCEPTED_FILE_TYPES.includes(file.type),
			'Please upload an image.'
		)
		.optional()
});

export type EditPaymentMethod = z.infer<typeof editPaymentMethod>;

export const deleteTestimonial = z.object({
	id: z.coerce.number()
});

export type DeleteTestimonial = z.infer<typeof deleteTestimonial>;
