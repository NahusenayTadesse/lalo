import { m } from '$lib/paraglide/messages.js';
import { z } from 'zod/v4';

export const ForgotPasswordSchema = z.object({
	email: z.email({ error: () => m.form_email_required() })
});
