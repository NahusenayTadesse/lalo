import { db } from '$lib/server/db';
import { requireAdmin } from '$lib/server/authz';
import type { LayoutServerLoad } from './$types';

import { orders, contactMessages } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

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

	const messageNumber = await db
		.select({ count: count() })
		.from(contactMessages)
		.where(eq(contactMessages.seen, false))
		.then((rows) => rows[0]?.count ?? 0);

	return {
		name: currentUser.name,
		ordersNumber,
		messageNumber
	};
};
