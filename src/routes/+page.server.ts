import { db } from '$lib/server/db';
import { testimonials as paymentMethods } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const allPaymentMethods = await db
		.select({
			id: paymentMethods.id,
			name: paymentMethods.name,
			position: paymentMethods.position,
			avatar: paymentMethods.avatar,
			testimonial: paymentMethods.message
		})
		.from(paymentMethods);

	return {
		allPaymentMethods
	};
};
