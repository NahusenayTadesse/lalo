import { z } from 'zod/v4';

export const add = z.object({
	name: z.string('Name is Required').min(2).max(100),
	email: z.email('Email is Required'),
	// Matches better-auth's default minimum, so the error lands on the field.
	password: z.string('Password is required!').min(8, 'Password must be at least 8 characters'),
	role: z.number('Role is required!')
});
