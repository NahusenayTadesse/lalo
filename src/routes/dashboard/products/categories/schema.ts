import type { Description } from '$lib/components/ui/sheet';
import { z } from 'zod/v4';

export const add = z.object({
	name: z.string('Name of Payment Method is required').min(2).max(50),
	description: z.string('Description is required').min(2).max(100),
	// Amharic, optional — left blank, the public site shows the English text.
	nameAm: z.string().max(255).optional(),
	descriptionAm: z.string().max(1000).optional(),
	status: z.boolean('Status is required')
});

export const edit = z.object({
	id: z.coerce.string(),
	name: z.string('Name of Payment Method is required').min(2).max(50),
	description: z.string('Description is required').min(2).max(100),
	// Amharic, optional — left blank, the public site shows the English text.
	nameAm: z.string().max(255).optional(),
	descriptionAm: z.string().max(1000).optional(),
	status: z.boolean('Status is required')
});
export type Edit = z.infer<typeof edit>;
