import { z } from 'zod/v4';
import { ethiopianPhone } from '$lib/validators/phone';

export const contactSchema = z.object({
	name: z.string('Name is Required').min(2, 'Name must be at least 2 characters'),
	email: z.email('Email is required'),
	// Any of the local/national forms (`0912…`, `+251912…`) is accepted; the
	// action normalises to `+251XXXXXXXXX` before it stores the message.
	phoneNumber: ethiopianPhone(),
	subject: z.string().min(3, 'Subject must be at least 3 characters'),
	contactMessage: z.string().optional(),
	address: z.string().optional()
});
