import { db } from '$lib/server/db';
import { requireAdmin } from '$lib/server/authz';
import type { LayoutServerLoad } from './$types';

import { orders, contactMessages, deliveries } from '$lib/server/db/schema';
import { eq, count, sql } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	// Enforcement proper lives in `hooks.server.ts`, which also covers form
	// actions; this reuses the role it cached on `locals`, so it costs no query.
	const currentUser = await requireAdmin(locals);

	depends('app:messages');

	const ordersNumber = await db
		.select({ count: count(orders.id) })
		.from(orders)
		.where(eq(orders.status, 'pending'))
		.then((rows) => rows[0]?.count ?? 0);

	// Deliveries needing someone: waiting to go out, failed, or out and late.
	const deliveryNumber = await db
		.select({ count: count() })
		.from(deliveries)
		.where(
			sql`${deliveries.status} IN ('ready', 'failed') OR (${deliveries.status} = 'dispatched' AND ${deliveries.scheduledFor} < NOW())`
		)
		.then((rows) => rows[0]?.count ?? 0);

	const messageNumber = await db
		.select({ count: count() })
		.from(contactMessages)
		.where(eq(contactMessages.seen, false))
		.then((rows) => rows[0]?.count ?? 0);

	return {
		name: currentUser.name,
		permList: locals.permList,
		isSuperAdmin: locals.isSuperAdmin,
		ordersNumber,
		deliveryNumber,
		messageNumber
	};
};
