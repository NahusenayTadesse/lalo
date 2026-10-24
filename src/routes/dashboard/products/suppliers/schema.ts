import type { Description } from '@nahu/admin-kit/components/ui/sheet/index.js';
import { z } from 'zod/v4';

export const add = z.object({
	name: z.string().min(1, 'Name is required'),
	phone: z.string().min(10, 'Phone is required').max(15),
	email: z.email(),
	description: z.string().optional(),

	status: z.boolean('Status is required').default(true)
});

// To use this for a single row result

export const edit = z.object({
	id: z.coerce.string(),
	name: z.string().min(1, 'Name is required'),
	phone: z.string().min(10, 'Phone is required').max(15),
	email: z.email(),
	description: z.string().optional(),
	status: z.boolean('Status is required').default(true)
});
export type Edit = z.infer<typeof edit>;
