import { db } from '$lib/server/db';
import { products, productCategories, prices } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import { eq, sql, and, like, asc, count, gte, lte, inArray } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const pageSize = 20;
	const offset = (page - 1) * pageSize;
	const min = Number(url.searchParams.get('min')) || 0;
	const max = Number(url.searchParams.get('max')) || 1000000;
	const selectedCats = url.searchParams.get('categories')?.split(',').filter(Boolean) ?? [];

	// Full where clause — used for the main product query (has joins)
	const whereClause = and(
		eq(products.isActive, true),
		search ? like(products.name, `%${search}%`) : undefined,
		gte(prices.price, min),
		lte(prices.price, max),
		selectedCats.length > 0 ? inArray(productCategories.name, selectedCats) : undefined
	);

	const categories = await db
		.select({ name: productCategories.name })
		.from(productCategories)
		.groupBy(productCategories.name);

	const productsData = await db
		.select({
			productId: products.id,
			productName: products.name,
			price: sql<number>`min(${prices.price})`,
			amount: sql<number>`min(${prices.amount})`,
			image: products.featuredImage,
			category: productCategories.name
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(prices, eq(prices.productId, products.id))
		.where(whereClause)
		.groupBy(products.id, productCategories.name)
		.orderBy(asc(products.createdAt))
		.limit(pageSize)
		.offset(offset);

	const [totalResult] = await db
		.select({ count: count(products.id) })
		.from(products)
		.where(eq(products.isActive, true));

	const totalCount = totalResult.count;
	const totalPages = Math.ceil(totalCount / pageSize - 1);

	const productIds = productsData.map((p) => p.productId);
	let allPrices = [];
	if (productIds.length > 0) {
		allPrices = await db.select().from(prices).where(inArray(prices.productId, productIds)); // ✅ cleaner than raw sql`IN`
	}

	const productList = productsData.map((p) => ({
		...p,
		priceList: allPrices
			.filter((price) => price.productId === p.productId)
			.map((price) => ({
				amount: price.amount,
				price: price.price
			}))
	}));

	return {
		productList,
		categories,
		pagination: {
			currentPage: page,
			totalPages,
			totalCount,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1
		}
	};
};
