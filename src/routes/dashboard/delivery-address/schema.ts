import { z } from 'zod/v4';

// A negative fee would *subtract* from every order delivered to that area.
export const add = z.object({
	name: z.string('Name of the delivery area is required').min(2).max(50),
	fee: z.number('Number is required').nonnegative('Fee cannot be negative').default(0),
	status: z.boolean('Status is required').default(true)
});

export const edit = z.object({
	id: z.coerce.string(),
	name: z.string('Name of the delivery area is required').min(2).max(50),
	fee: z.number('Number is required').nonnegative('Fee cannot be negative').default(0),
	status: z.boolean('Status is required').default(true)
});
export type Edit = z.infer<typeof edit>;

/** A threshold of 0 turns free delivery off (see `resolveDeliveryFee`). */
export const free = z.object({
	threshold: z.number('Number is required').nonnegative('Cannot be negative').default(0),
	suggestionThreshold: z.number('Number is required').nonnegative('Cannot be negative').default(0)
});
export type Free = z.infer<typeof free>;
