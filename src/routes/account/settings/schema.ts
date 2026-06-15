import { z } from 'zod/v4';

export const editUserSchema = z.object({
	email: z.email('Email is required'),
	name: z.string('Name is required').min(2).max(100),
	phone: z.string('Phone is required').min(10).max(15).optional()
});
