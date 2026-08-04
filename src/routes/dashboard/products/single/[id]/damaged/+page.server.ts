import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, damagedProducts, products } from '$lib/server/db/schema';
import { and, asc, eq, like, or, sql } from 'drizzle-orm';

import { currentMonthFilter, getCurrentMonthRangeDates, isValidDateString } from '$lib/global.svelte';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const { id } = params as { id: string };

	const startParam = url.searchParams.get('start');
	const endParam = url.searchParams.get('end');
	const search = url.searchParams.get('search')?.trim() ?? '';
	const reasonFilter = url.searchParams.get('reason') ?? '';

	if ((startParam || endParam) && (!isValidDateString(startParam) || !isValidDateString(endParam))) {
		error(400, 'Invalid date range');
	}

	const defaults = getCurrentMonthRangeDates();
	const start = startParam ?? defaults.start;
	const end = endParam ?? defaults.end;

	const product = await db
		.select({ name: products.name })
		.from(products)
		.where(eq(products.id, Number(id)))
		.then((rows) => rows[0]);

	if (!product) error(404, 'Product not found');

	const whereClause = and(
		eq(damagedProducts.productId, Number(id)),
		currentMonthFilter(damagedProducts.createdAt, start, end),
		search
			? or(
					like(damagedProducts.reason, `%${search}%`),
					like(damagedProducts.damagedBy, `%${search}%`)
				)
			: undefined,
		reasonFilter ? eq(damagedProducts.reason, reasonFilter) : undefined
	);

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
		.where(whereClause)
		.orderBy(asc(damagedProducts.createdAt));

	const reasonRows = await db
		.selectDistinct({ reason: damagedProducts.reason })
		.from(damagedProducts)
		.where(eq(damagedProducts.productId, Number(id)));

	return {
		allTransactions,
		product,
		start,
		end,
		search,
		reasonFilter,
		reasonOptions: reasonRows.map((r) => r.reason).filter(Boolean)
	};
};
