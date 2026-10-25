import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	transactions,
	user,
	productAdjustments,
	productSuppliers,
	prices,
	stockBatches
} from '$lib/server/db/schema';
import { and, asc, eq, gt, like, lt, or, sql } from 'drizzle-orm';

import {
	currentMonthFilter,
	getCurrentMonthRangeDates,
	isValidDateString
} from '$lib/global.svelte';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const id = Number(params.id);

	const startParam = url.searchParams.get('start');
	const endParam = url.searchParams.get('end');
	const search = url.searchParams.get('search')?.trim() ?? '';
	const supplierParam = url.searchParams.get('supplier') ?? '';
	const typeParam = url.searchParams.get('type') ?? '';
	const variantParam = url.searchParams.get('variant') ?? '';

	if (
		(startParam || endParam) &&
		(!isValidDateString(startParam) || !isValidDateString(endParam))
	) {
		error(400, 'Invalid date range');
	}

	const defaults = getCurrentMonthRangeDates();
	const start = startParam ?? defaults.start;
	const end = endParam ?? defaults.end;

	const whereClause = and(
		eq(productAdjustments.productsId, id),
		currentMonthFilter(productAdjustments.createdAt, start, end),
		search
			? or(
					like(productAdjustments.reason, `%${search}%`),
					like(stockBatches.batchNumber, `%${search}%`)
				)
			: undefined,
		supplierParam ? eq(productAdjustments.supplierId, Number(supplierParam)) : undefined,
		variantParam ? eq(productAdjustments.variantId, Number(variantParam)) : undefined,
		typeParam === 'increase'
			? gt(productAdjustments.adjustment, 0)
			: typeParam === 'decrease'
				? lt(productAdjustments.adjustment, 0)
				: undefined
	);

	const allTransactions = await db
		.select({
			id: productAdjustments.id,
			date: sql<string>`DATE_FORMAT(${productAdjustments.createdAt}, '%W %Y-%m-%d')`,
			quantity: productAdjustments.adjustment,
			type: productAdjustments.type,
			variant: prices.amount,
			batchNumber: stockBatches.batchNumber,
			balanceAfter: productAdjustments.balanceAfter,
			orderId: productAdjustments.orderId,
			reason: productAdjustments.reason,
			changedBy: user.name,
			changedById: user.id,
			reciept: transactions.recieptLink
		})
		.from(productAdjustments)
		.leftJoin(transactions, eq(transactions.id, productAdjustments.transactionId))
		.leftJoin(user, eq(productAdjustments.createdBy, user.id))
		.leftJoin(prices, eq(prices.id, productAdjustments.variantId))
		.leftJoin(stockBatches, eq(stockBatches.id, productAdjustments.batchId))
		.where(whereClause)
		.orderBy(asc(productAdjustments.createdAt));

	const supplierOptions = await db
		.selectDistinct({ id: productSuppliers.id, name: productSuppliers.name })
		.from(productAdjustments)
		.innerJoin(productSuppliers, eq(productSuppliers.id, productAdjustments.supplierId))
		.where(eq(productAdjustments.productsId, id));

	const variantOptions = await db
		.select({ id: prices.id, name: prices.amount })
		.from(prices)
		.where(eq(prices.productId, id));

	return {
		allTransactions,
		variantOptions,
		variantFilter: variantParam,
		start,
		end,
		search,
		supplierFilter: supplierParam,
		typeFilter: typeParam,
		supplierOptions
	};
};
