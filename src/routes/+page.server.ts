import { localized, localizedOrNull } from '$lib/server/localize';
import { db } from '$lib/server/db';
import { testimonials as paymentMethods } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const allPaymentMethods = await db
		.select({
			id: paymentMethods.id,
			name: paymentMethods.name,
			position: localizedOrNull(paymentMethods.position, paymentMethods.positionAm),
			avatar: paymentMethods.avatar,
			testimonial: localized(paymentMethods.message, paymentMethods.messageAm)
		})
		.from(paymentMethods);

	return {
		allPaymentMethods
	};
};
