import { z } from 'zod/v4';

export const add = z.object({
	customer: z.coerce.number('Customer is required'),
	selectedProducts: z
		.object({
			product: z.number({ message: 'Product is required' }).int().positive('Product is required'),
			quantity: z.number().int().positive('Number of products must be at least 1')
		})
		.array(),

	status: z
		.enum(['pending', 'delivered', 'cancelled'], { message: 'Status is required' })
		.default('pending')
});

export const edit = z.object({
	id: z.coerce.number(),
	customer: z.coerce.number('Customer is required'),
	selectedProducts: z
		.object({
			product: z.number({ message: 'Product is required' }).int().positive('Product is required'),
			quantity: z.number().int().positive('Number of products must be at least 1')
		})
		.array(),

	status: z
		.enum(['pending', 'delivered', 'cancelled'], { message: 'Status is required' })
		.default('pending')
});
export type Edit = z.infer<typeof edit>;
