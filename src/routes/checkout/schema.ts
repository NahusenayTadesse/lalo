import { z } from 'zod/v4';
export const add = z.object({
	selectedProducts: z
		.object({
			amount: z.string({ message: 'Variation is required' }),
			price: z.number({ message: 'Price is required' }).positive('Price is required'),
			product: z.number({ message: 'Product is required' }).int().positive('Product is required'),
			quantity: z.number().int().positive('Number of products must be at least 1')
		})
		.array()
});
