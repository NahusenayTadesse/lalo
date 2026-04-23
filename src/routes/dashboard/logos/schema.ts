import { z } from 'zod/v4';

export const editGallery = z.object({
	existing: z.string(),
	images: z.file().max(10000000).array().optional()
});
