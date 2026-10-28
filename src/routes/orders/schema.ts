import { m } from '$lib/paraglide/messages.js';
import { z } from 'zod/v4';

export const add = z.object({
	customer: z.coerce.number({ error: () => m.orders_customer_required() }),
	selectedProducts: z
		.object({
			product: z
				.number({ error: () => m.orders_product_required() })
				.int()
				.positive({ error: () => m.orders_product_required() }),
			quantity: z
				.number()
				.int()
				.positive({ error: () => m.orders_quantity_min() }),
			amount: z.string({ error: () => m.orders_amount_required() })
		})
		.array()
});

export const edit = z.object({
	id: z.coerce.number(),
	customer: z.coerce.number({ error: () => m.orders_customer_required() }),
	selectedProducts: z
		.object({
			product: z
				.number({ error: () => m.orders_product_required() })
				.int()
				.positive({ error: () => m.orders_product_required() }),
			quantity: z
				.number()
				.int()
				.positive({ error: () => m.orders_quantity_min() }),
			amount: z.string({ error: () => m.orders_amount_required() })
		})
		.array()
});
export type Edit = z.infer<typeof edit>;
