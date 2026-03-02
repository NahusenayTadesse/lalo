import { z } from 'zod/v4';

export const edit = z.object({
	name: z
		.string('Name is Required')
		.min(2, 'Name must be at least 2 characters')
		.max(100, 'Name must be at most 100 characters'),
	email: z.email('Email is Required'),
	phone: z
		.string('Phone Number is Required')
		.min(2, 'Phone must be at least 2 characters')
		.max(20, 'Phone must be at most 20 characters'),
	address: z.string('Address is Required'),
	status: z.boolean().default(true)
});
export type Edit = z.infer<typeof edit>;
