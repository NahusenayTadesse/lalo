import { db } from '$lib/server/db';
import { transactions, user, productAdjustments } from '$lib/server/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';

import { currentMonthFilter } from '$lib/global.svelte';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = Number(params.id);
	const { range } = params as { range: string };

	const [y1, m1, d1, y2, m2, d2] = range.split('-');

	const start = `${y1}-${m1}-${d1}`;
	const end = `${y2}-${m2}-${d2}`;

	const allTransactions = await db
		.select({
			id: productAdjustments.id,
			date: sql<string>`DATE_FORMAT(${productAdjustments.createdAt}, '%W %Y-%m-%d')`,
			quantity: productAdjustments.adjustment,
			reason: productAdjustments.reason,
			changedBy: user.name,
			changedById: user.id,
			reciept: transactions.recieptLink
		})
		.from(productAdjustments)
		.leftJoin(transactions, eq(transactions.id, productAdjustments.transactionId))

		.leftJoin(user, eq(productAdjustments.createdBy, user.id))
		.where(
			and(
				eq(productAdjustments.productsId, id),
				currentMonthFilter(productAdjustments.createdAt, start, end)
			)
		)
		.orderBy(asc(productAdjustments.createdAt));

	return {
		allTransactions,
		start,
		end
	};
};
