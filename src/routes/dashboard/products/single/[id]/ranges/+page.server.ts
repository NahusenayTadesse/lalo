import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { transactions, user, productAdjustments } from '$lib/server/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';

import { currentMonthFilter, getCurrentMonthRangeDates, isValidDateString } from '$lib/global.svelte';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const id = Number(params.id);

	const startParam = url.searchParams.get('start');
	const endParam = url.searchParams.get('end');

	if ((startParam || endParam) && (!isValidDateString(startParam) || !isValidDateString(endParam))) {
		error(400, 'Invalid date range');
	}

	const defaults = getCurrentMonthRangeDates();
	const start = startParam ?? defaults.start;
	const end = endParam ?? defaults.end;

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
