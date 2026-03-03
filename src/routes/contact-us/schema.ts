import { z } from 'zod/v4';
const ethiopianPhoneRegex = /^(?:\+251|251|0)?([79]\d{8})$/;
export const contactSchema = z.object({
	name: z.string('Name is Required').min(2, 'Name must be at least 2 characters'),
	email: z.email('Email is required'),
	phoneNumber: z
		.string()
		.trim()
		.regex(ethiopianPhoneRegex, 'Invalid Ethiopian phone number')
		// Optional: Transform the input to a standardized format (e.g., +251...)
		.transform((val) => {
			const match = val.match(ethiopianPhoneRegex);
			const mainNumber = match?.[1];
			return `+251${mainNumber}`;
		}),
	subject: z.string().min(3, 'Subject must be at least 3 characters'),
	message: z.string().min(10, 'Message must be at least 10 characters')
});
