import { z } from 'zod/v4';

/**
 * Mirrors `addCustomer`: a walk-in customer may have no email and no address, so
 * requiring them here made those customers impossible to edit at all.
 */
export const edit = z.object({
	name: z
		.string('Name is Required')
		.min(2, 'Name must be at least 2 characters')
		.max(100, 'Name must be at most 100 characters'),
	email: z.email('Enter a valid email').max(100, 'Email is too long').optional().or(z.literal('')),
	phone: z
		.string('Phone Number is Required')
		.min(7, 'Phone number is too short')
		.max(20, 'Phone must be at most 20 characters'),
	address: z.string().max(255, 'Address is too long').optional().or(z.literal('')),
	deliveryAddress: z.string().max(255, 'Delivery address is too long').optional().or(z.literal('')),
	status: z.boolean().default(true)
});
export type Edit = z.infer<typeof edit>;
