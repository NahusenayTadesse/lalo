import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { placeNames, freeDelivery } from '$lib/server/db/schema';
import { PICKUP_LABEL } from '$lib/delivery';

/**
 * The delivery fee charged for `placeName`, or `undefined` when nothing is
 * delivered there. Orders at or above the free-delivery threshold pay nothing,
 * whatever the area, and a local-pickup order is free by definition.
 *
 * `placeName` is `place_names.name`, picked from a select — the free-text street
 * address (`deliveryAddress`) carries no fee. Applied server-side so the fee a
 * browser posts never has to be trusted.
 *
 * Shared by checkout and the dashboard order actions: a fee quoted to a customer
 * and the fee staff see on the same order have to be the one number, so neither
 * side computes it on its own.
 */
export async function resolveDeliveryFee(
	placeName: string,
	subtotal: number
): Promise<string | undefined> {
	// `PICKUP_LABEL` is not a row in `place_names`, so without this the lookup
	// below returns `undefined` and every caller reads that as "we do not deliver
	// to that area" — which would make a pickup order impossible to save or edit.
	if (placeName === PICKUP_LABEL) return '0.00';

	const place = await db
		.select({ fee: placeNames.fee })
		.from(placeNames)
		.where(and(eq(placeNames.name, placeName), eq(placeNames.isActive, true)))
		.limit(1)
		.then((rows) => rows[0]);

	if (!place) return undefined;

	const threshold = await db
		.select({ value: freeDelivery.threshold })
		.from(freeDelivery)
		.limit(1)
		.then((rows) => rows[0]);

	if (threshold && subtotal >= Number(threshold.value)) return '0.00';

	return place.fee;
}
