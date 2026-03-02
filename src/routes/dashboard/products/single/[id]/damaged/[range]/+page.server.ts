import { db } from '$lib/server/db';
import { user, damagedProducts } from '$lib/server/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';

import { currentMonthFilter } from '$lib/global.svelte';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params as { id: string };
	const { range } = params as { range: string };

	const [y1, m1, d1, y2, m2, d2] = range.split('-');

	const start = `${y1}-${m1}-${d1}`;
	const end = `${y2}-${m2}-${d2}`;

	const allTransactions = await db
		.select({
			id: damagedProducts.id,
			date: sql<string>`DATE_FORMAT(${damagedProducts.createdAt}, '%W %Y-%m-%d')`,
			quantity: damagedProducts.quantity,
			reason: damagedProducts.reason,
			damagedBy: damagedProducts.damagedBy,
			changedById: user.id,
			changedBy: user.name
		})
		.from(damagedProducts)
		.leftJoin(user, eq(damagedProducts.createdBy, user.id))
		.where(
			and(
				eq(damagedProducts.productId, Number(id)),
				currentMonthFilter(damagedProducts.createdAt, start, end)
			)
		)
		.orderBy(asc(damagedProducts.createdAt));

	return {
		allTransactions,
		start,
		end
	};
};
