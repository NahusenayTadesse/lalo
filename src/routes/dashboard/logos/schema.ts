import { z } from 'zod/v4';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];

export const editGallery = z.object({
	existing: z.string().default(''),
	// Logos are shown as <img> on the home page — anything else is refused rather than
	// stored and served as a download.
	images: z
		.file()
		.max(10_000_000, 'Max file size is 10MB.')
		.refine((file) => IMAGE_TYPES.includes(file.type), 'Please upload images only.')
		.array()
		.optional()
});
