import { z } from 'zod/v4';
import { receiptFile } from '$lib/receipt';
import { isEthiopianPhone, INVALID_PHONE_MESSAGE } from '$lib/validators/phone';

const text = (max: number, what: string) =>
	z.string().trim().max(max, `${what} is too long`).optional().or(z.literal(''));

/** An optional phone: blank, or a valid Ethiopian number. */
const phone = z
	.string()
	.trim()
	.refine((v) => v === '' || isEthiopianPhone(v), { error: INVALID_PHONE_MESSAGE })
	.optional();

/** A `datetime-local` value, in Addis Ababa time. Blank means "now" or "not set". */
const when = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Pick a date and time')
	.optional()
	.or(z.literal(''));

const id = z.coerce.number().int().positive();

/** Dispatching, and correcting a trip afterwards: the driver, the vehicle, the destination. */
export const trip = z.object({
	id,
	driverId: z.coerce.number().int().min(0).default(0),
	driverName: text(100, 'Driver name'),
	driverPhone: phone,
	vehiclePlate: text(20, 'Plate number'),
	vehicleType: text(50, 'Vehicle type'),
	scheduledFor: when,
	dispatchedAt: when,
	area: text(255, 'Area'),
	address: text(255, 'Address'),
	recipientName: text(100, 'Recipient name'),
	recipientPhone: phone,
	notes: text(500, 'Notes')
});

export const deliver = z.object({
	id,
	deliveredAt: when,
	receivedBy: text(100, 'Name'),
	note: text(255, 'Note'),
	// Only asked for when the order is still unpaid: how the driver was paid.
	paymentMethod: z.coerce.number().int().min(0).default(0),
	proof: receiptFile.optional()
});

/** Failing a trip, or reopening a delivered one: both need a reason on the record. */
export const withReason = z.object({
	id,
	reason: z.string().trim().min(3, 'Say what happened').max(255, 'Keep it under 255 characters')
});

export const requeue = z.object({ id, scheduledFor: when });

export const driver = z.object({
	id: z.coerce.number().int().min(0).default(0),
	name: z.string().trim().min(2, 'Name is required').max(100),
	phone: z.string().trim().refine(isEthiopianPhone, { error: INVALID_PHONE_MESSAGE }),
	vehiclePlate: text(20, 'Plate number'),
	vehicleType: text(50, 'Vehicle type'),
	notes: text(255, 'Notes'),
	active: z.boolean().default(true)
});
