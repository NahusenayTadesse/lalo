import { z } from 'zod/v4';
import { INVALID_PHONE_MESSAGE, isEthiopianPhone } from '$lib/validators/phone';

export const editUserSchema = z.object({
	email: z.email('Email is required'),
	name: z.string('Name is required').min(2).max(100),
	// A real Ethiopian number in any usual form, or left empty. `min(10).max(15)`
	// accepted "abcdefghij", rejected "+251 91 234 5678" and rejected an empty box.
	// The action normalises it to `+251XXXXXXXXX`, like signup and checkout.
	phone: z
		.string()
		.trim()
		.refine((value) => value === '' || isEthiopianPhone(value), INVALID_PHONE_MESSAGE)
		.optional(),
	address: z.string('Address is required'),
	deliveryAddress: z.string('Delivery Address is required').min(5).max(200)
});
