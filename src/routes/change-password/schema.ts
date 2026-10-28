import { m } from '$lib/paraglide/messages.js';
import { z } from 'zod/v4';

const strongPassword = z
	.string()
	.min(8, { error: () => m.form_password_min() })
	.regex(/[A-Z]/, { error: () => m.cp_need_upper() })
	.regex(/[a-z]/, { error: () => m.cp_need_lower() })
	.regex(/[0-9]/, { error: () => m.cp_need_number() })
	.regex(/[^A-Za-z0-9]/, { error: () => m.cp_need_special() });

export const changePasswordSchema = z
	.object({
		currentPassword: z.string().min(1, { error: () => m.cp_current_required() }),
		newPassword: strongPassword,
		confirmPassword: z.string().min(1, { error: () => m.cp_confirm_required() })
	})
	// Checked on the server too: the page only disabled its submit button on a mismatch,
	// which a hand-made request skips.
	.refine((data) => data.newPassword === data.confirmPassword, {
		error: () => m.form_passwords_mismatch(),
		path: ['confirmPassword']
	});
