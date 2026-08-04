import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	orders,
	orderItems,
	products,
	productCategories,
	customers,
	transactions,
	paymentMethods
} from '$lib/server/db/schema';
import { and, asc, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';

import { getPresetDateRange, isValidDateString, type DatePreset } from '$lib/global.svelte';
import type { PageServerLoad } from './$types';

const DEFAULT_PAGE_SIZE = 20;
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];
const STATUSES = ['pending', 'delivered', 'cancelled'] as const;

export const load: PageServerLoad = async ({ url }) => {
	const startParam = url.searchParams.get('start');
	const endParam = url.searchParams.get('end');
	const presetParam = url.searchParams.get('preset');

	if ((startParam || endParam) && (!isValidDateString(startParam) || !isValidDateString(endParam))) {
		error(400, 'Invalid date range');
	}

	let start: string | undefined;
	let end: string | undefined;

	if (startParam && endParam) {
		start = startParam;
		end = endParam;
	} else if (presetParam !== 'allTime') {
		const preset = getPresetDateRange((presetParam as DatePreset) ?? 'thisMonth') ?? undefined;
		start = preset?.start;
		end = preset?.end;
	}

	const statusParam = url.searchParams.get('status') ?? 'all';
	const status = STATUSES.includes(statusParam as (typeof STATUSES)[number]) ? statusParam : 'all';
	const search = url.searchParams.get('search')?.trim() ?? '';
	const paymentMethodFilter = url.searchParams.get('paymentMethod');
	const categoryFilter = url.searchParams.get('category');
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const pageSizeParam = parseInt(url.searchParams.get('pageSize') ?? '');
	const pageSize = ALLOWED_PAGE_SIZES.includes(pageSizeParam) ? pageSizeParam : DEFAULT_PAGE_SIZE;
	const offset = (page - 1) * pageSize;

	const whereClause = and(
		status !== 'all' ? eq(orders.status, status as (typeof STATUSES)[number]) : undefined,
		start ? gte(orders.createdAt, new Date(start)) : undefined,
		end ? lte(orders.createdAt, new Date(`${end}T23:59:59`)) : undefined,
		paymentMethodFilter ? eq(transactions.paymentMethodId, Number(paymentMethodFilter)) : undefined,
		categoryFilter ? eq(products.categoryId, Number(categoryFilter)) : undefined,
		search
			? or(
					like(customers.name, `%${search}%`),
					like(customers.phone, `%${search}%`),
					like(customers.email, `%${search}%`),
					like(products.name, `%${search}%`),
					like(orders.deliveryAddress, `%${search}%`)
				)
			: undefined
	);

	const lineTotalSql = sql<number>`${orderItems.quantity} * ${orderItems.price}`;

	// ---- item-level aggregates (safe to SUM directly — one row per order item) ----

	const [{ totalRevenue, totalItemsSold }] = await db
		.select({
			totalRevenue: sql<number>`COALESCE(SUM(${lineTotalSql}), 0)`.mapWith(Number),
			totalItemsSold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`.mapWith(Number)
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(whereClause);

	const dailyTrend = await db
		.select({
			date: sql<string>`DATE(${orders.createdAt})`,
			revenue: sql<number>`COALESCE(SUM(${lineTotalSql}), 0)`.mapWith(Number),
			orderCount: sql<number>`COUNT(DISTINCT ${orders.id})`.mapWith(Number)
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(whereClause)
		.groupBy(sql`DATE(${orders.createdAt})`)
		.orderBy(asc(sql`DATE(${orders.createdAt})`));

	const topProducts = await db
		.select({
			productId: products.id,
			name: products.name,
			quantitySold: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`.mapWith(Number),
			revenue: sql<number>`COALESCE(SUM(${lineTotalSql}), 0)`.mapWith(Number)
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(whereClause)
		.groupBy(products.id, products.name)
		.orderBy(desc(sql`SUM(${lineTotalSql})`))
		.limit(5);

	// ---- order-level rows, deduped so fee/status/payment aren't double-counted
	// across an order's multiple line items ----

	const orderLevelRows = await db
		.selectDistinct({
			orderId: orders.id,
			fee: orders.fee,
			status: orders.status,
			paymentMethodName: paymentMethods.name,
			totalPaid: transactions.amount
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.leftJoin(paymentMethods, eq(transactions.paymentMethodId, paymentMethods.id))
		.where(whereClause);

	const totalOrders = orderLevelRows.length;
	const totalDeliveryFees = orderLevelRows.reduce((sum, o) => sum + Number(o.fee ?? 0), 0);
	const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

	const statusBreakdown = STATUSES.map((s) => ({
		status: s,
		count: orderLevelRows.filter((o) => o.status === s).length
	}));

	const paymentBreakdownMap = new Map<string, { revenue: number; orders: number }>();
	for (const o of orderLevelRows) {
		const key = o.paymentMethodName ?? 'Unpaid / No Method';
		const entry = paymentBreakdownMap.get(key) ?? { revenue: 0, orders: 0 };
		entry.revenue += Number(o.totalPaid ?? 0);
		entry.orders += 1;
		paymentBreakdownMap.set(key, entry);
	}
	const paymentBreakdownFull = Array.from(paymentBreakdownMap.entries())
		.map(([name, v]) => ({ name, ...v }))
		.sort((a, b) => b.revenue - a.revenue);

	// Cap chart slices at 6 + "Other" — past ~7 color classes, adjacent hues blur.
	const MAX_SLICES = 6;
	const paymentBreakdown =
		paymentBreakdownFull.length <= MAX_SLICES + 1
			? paymentBreakdownFull
			: [
					...paymentBreakdownFull.slice(0, MAX_SLICES),
					paymentBreakdownFull.slice(MAX_SLICES).reduce(
						(acc, p) => ({ name: 'Other', revenue: acc.revenue + p.revenue, orders: acc.orders + p.orders }),
						{ name: 'Other', revenue: 0, orders: 0 }
					)
				];

	// ---- revenue by product category ----

	const categoryRevenueRaw = await db
		.select({
			categoryName: productCategories.name,
			revenue: sql<number>`COALESCE(SUM(${lineTotalSql}), 0)`.mapWith(Number)
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(productCategories, eq(products.categoryId, productCategories.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(whereClause)
		.groupBy(products.categoryId, productCategories.name)
		.orderBy(desc(sql`SUM(${lineTotalSql})`));

	const categoryBreakdownFull = categoryRevenueRaw.map((c) => ({
		name: c.categoryName ?? 'Uncategorized',
		revenue: c.revenue
	}));

	const categoryBreakdown =
		categoryBreakdownFull.length <= MAX_SLICES + 1
			? categoryBreakdownFull
			: [
					...categoryBreakdownFull.slice(0, MAX_SLICES),
					categoryBreakdownFull.slice(MAX_SLICES).reduce(
						(acc, c) => ({ name: 'Other', revenue: acc.revenue + c.revenue }),
						{ name: 'Other', revenue: 0 }
					)
				];

	// ---- paginated line-item detail table ----

	const detailRows = await db
		.select({
			orderId: orders.id,
			date: sql<string>`DATE_FORMAT(${orders.createdAt}, '%W %Y-%m-%d')`,
			status: orders.status,
			customerName: customers.name,
			customerId: customers.id,
			productName: products.name,
			productId: products.id,
			quantityPurchased: orderItems.quantity,
			unitPrice: orderItems.price,
			lineTotal: lineTotalSql.mapWith(Number),
			paymentMethodName: paymentMethods.name,
			totalPaid: transactions.amount,
			receipt: transactions.recieptLink
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.leftJoin(paymentMethods, eq(transactions.paymentMethodId, paymentMethods.id))
		.where(whereClause)
		.orderBy(desc(orders.createdAt))
		.limit(pageSize)
		.offset(offset);

	const [{ totalRows }] = await db
		.select({ totalRows: sql<number>`COUNT(*)`.mapWith(Number) })
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.where(whereClause);

	const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

	const categories = await db
		.select({ value: productCategories.id, name: productCategories.name })
		.from(productCategories);

	const paymentMethodList = await db
		.select({ value: paymentMethods.id, name: paymentMethods.name })
		.from(paymentMethods);

	return {
		detailRows,
		summary: {
			totalRevenue,
			totalItemsSold,
			totalOrders,
			totalDeliveryFees,
			averageOrderValue,
			statusBreakdown,
			paymentBreakdown,
			categoryBreakdown,
			topProducts,
			dailyTrend
		},
		categories,
		paymentMethodList,
		filters: {
			search,
			status,
			start,
			end,
			preset: startParam || endParam ? undefined : (presetParam ?? 'thisMonth'),
			paymentMethod: paymentMethodFilter,
			category: categoryFilter,
			pageSize
		},
		pagination: {
			currentPage: page,
			totalPages,
			totalCount: totalRows,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1
		}
	};
};
