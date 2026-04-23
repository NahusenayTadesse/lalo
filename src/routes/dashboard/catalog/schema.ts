import { z } from 'zod/v4';

export const editGallery = z.object({
	manual: z.file().max(100000000).optional(),
	catalog: z.file().max(100000000).optional()
});
