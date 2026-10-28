import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { deliveries, deliveryDrivers } from '$lib/server/db/schema';
import { normalizeEthiopianPhone } from '$lib/validators/phone';
import { driver } from '../schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Matched by the saved driver, or by name for trips typed in by hand.
	const trips = (condition: ReturnType<typeof sql>) =>
		sql<number>`(SELECT COUNT(*) FROM ${deliveries} d
			WHERE (d.driver_id = ${deliveryDrivers.id} OR (d.driver_id IS NULL AND d.driver_name = ${deliveryDrivers.name}))
			AND ${condition})`.mapWith(Number);

	const drivers = await db
		.select({
			id: deliveryDrivers.id,
			name: deliveryDrivers.name,
			phone: deliveryDrivers.phone,
			vehiclePlate: deliveryDrivers.vehiclePlate,
			vehicleType: deliveryDrivers.vehicleType,
			notes: deliveryDrivers.notes,
			active: deliveryDrivers.isActive,
			out: trips(sql`d.status = 'dispatched'`),
			delivered: trips(sql`d.status = 'delivered'`),
			failed: trips(sql`d.status = 'failed'`),
			// Delivered by the time promised, of the delivered trips that had one.
			onTime: trips(
				sql`d.status = 'delivered' AND d.scheduled_for IS NOT NULL AND d.delivered_at <= d.scheduled_for`
			),
			promised: trips(sql`d.status = 'delivered' AND d.scheduled_for IS NOT NULL`),
			lastTrip: sql<
				string | null
			>`(SELECT DATE_FORMAT(CONVERT_TZ(MAX(d.dispatched_at), @@session.time_zone, '+03:00'), '%Y-%m-%d %H:%i')
				FROM ${deliveries} d WHERE d.driver_id = ${deliveryDrivers.id} OR (d.driver_id IS NULL AND d.driver_name = ${deliveryDrivers.name}))`
		})
		.from(deliveryDrivers)
		.orderBy(sql`${deliveryDrivers.isActive} DESC`, asc(deliveryDrivers.name));

	return { drivers, form: await superValidate(zod4(driver)) };
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(driver));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const { id, name, phone, vehiclePlate, vehicleType, notes, active } = form.data;
		const values = {
			name,
			phone: normalizeEthiopianPhone(phone) ?? phone,
			vehiclePlate: vehiclePlate?.trim().toUpperCase() || null,
			vehicleType: vehicleType?.trim() || null,
			notes: notes?.trim() || null,
			isActive: active
		};

		try {
			if (id) {
				await db
					.update(deliveryDrivers)
					.set({ ...values, updatedBy: locals.user?.id })
					.where(eq(deliveryDrivers.id, id));
			} else {
				await db.insert(deliveryDrivers).values({ ...values, createdBy: locals.user?.id });
			}
		} catch (err) {
			console.error('Could not save driver:', err);
			return message(form, { type: 'error', text: 'Could not save the driver' }, { status: 500 });
		}
		return message(form, { type: 'success', text: id ? 'Driver updated' : 'Driver added' });
	}
};
