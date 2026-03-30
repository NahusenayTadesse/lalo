import { z } from 'zod/v4';

export const add = z.object({
	name: z.string('Name is Required').min(2).max(100),
	email: z.email('Email is Required'),
	password: z.string('Password is required!'),
	role: z.number('Role is required!')
});
