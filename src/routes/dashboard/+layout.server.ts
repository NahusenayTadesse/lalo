import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

import { orders, contactMessages } from '$lib/server/db/schema';
import { eq, count, gte } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	if (locals.user) {
		const roleName = (await parent()).roleName;
		if (roleName !== 'Admin') {
			return error(404, 'Not Allowed');
		}
	} else {
		return redirect(302, '/login');
	}

	const name = locals?.user?.name;
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	const ordersNumber = await db
		.select({ count: count(orders.id) })
		.from(orders)
		.where(eq(orders.status, 'pending'))
		.then((rows) => rows[0]?.count ?? 0);

	const messageNumber = await db
		.select({ count: count() })
		.from(contactMessages)
		.where(gte(contactMessages.createdAt, sevenDaysAgo))
		.then((rows) => rows[0]?.count ?? 0);

	return {
		name,
		ordersNumber,
		messageNumber
	};
};
