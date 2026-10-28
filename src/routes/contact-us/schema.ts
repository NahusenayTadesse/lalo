import { m } from '$lib/paraglide/messages.js';
import { z } from 'zod/v4';
import { ethiopianPhone } from '$lib/validators/phone';

export const contactSchema = z.object({
	name: z
		.string({ error: () => m.form_name_required() })
		.min(2, { error: () => m.form_name_min() })
		.max(100),
	email: z.email({ error: () => m.form_email_required() }),
	// Any of the local/national forms (`0912…`, `+251912…`) is accepted; the
	// action normalises to `+251XXXXXXXXX` before it stores the message.
	phoneNumber: ethiopianPhone(),
	subject: z
		.string()
		.min(3, { error: () => m.contact_subject_min() })
		.max(255),
	contactMessage: z
		.string()
		.max(5000, { error: () => m.contact_message_too_long() })
		.optional(),
	address: z.string().max(255).optional()
});
