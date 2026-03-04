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
	title: z.string().min(1, { message: 'Product Name is required.' }),

	description: z.string('Description are required.'),

	instructions: z.string('Instructions are required.'),

	prepTime: z.number('Prep Time is required').positive('Prep Time must be a positive number.'),

	cookTime: z.number('Cook Time is required').positive('Cook Time must be a positive number.'),

	ingredients: z
		.object({
			ingredient: z.string('Ingredients are required.'),
			amount: z.string('Amount are required.')
		})
		.array(),

	image: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
});
