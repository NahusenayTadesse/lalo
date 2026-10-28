import { m } from '$lib/paraglide/messages.js';
import { z } from 'zod/v4';
import { INVALID_PHONE_MESSAGE, isEthiopianPhone } from '$lib/validators/phone';

export const editUserSchema = z.object({
	email: z.email({ error: () => m.form_email_required() }),
	name: z
		.string({ error: () => m.form_name_required() })
		.min(2, { error: () => m.form_name_min() })
		.max(100),
	// A real Ethiopian number in any usual form, or left empty. `min(10).max(15)`
	// accepted "abcdefghij", rejected "+251 91 234 5678" and rejected an empty box.
	// The action normalises it to `+251XXXXXXXXX`, like signup and checkout.
	phone: z
		.string()
		.trim()
		.refine((value) => value === '' || isEthiopianPhone(value), { error: INVALID_PHONE_MESSAGE })
		.optional(),
	address: z.string({ error: () => m.form_area_required() }),
	deliveryAddress: z
		.string({ error: () => m.form_delivery_address_required() })
		.min(5, { error: () => m.form_delivery_address_min() })
		.max(200)
});
