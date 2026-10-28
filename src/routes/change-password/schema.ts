import { z } from 'zod/v4';

const strongPassword = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/[0-9]/, 'Password must contain at least one number')
	.regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
		newPassword: strongPassword,
		confirmPassword: z.string().min(1, 'Please confirm your new password')
	})
	// Checked on the server too: the page only disabled its submit button on a mismatch,
	// which a hand-made request skips.
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	});
