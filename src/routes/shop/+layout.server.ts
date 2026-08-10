import { db } from '$lib/server/db';
import { products, productCategories, prices } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import { eq, sql, and, like, asc, countDistinct, inArray } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	// `?? '1'` only covers a *missing* parameter: `parseInt('abc')` is NaN and
	// `Math.max(1, NaN)` is NaN, which reached the client as `currentPage: null`
	// and left Previous/Next computing `NaN ± 1`.
	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
	const pageSize = 20;
	const offset = (page - 1) * pageSize;
	const min = Number(url.searchParams.get('min')) || 0;
	const max = Number(url.searchParams.get('max')) || 1000000;
	const selectedCats = url.searchParams.get('categories')?.split(',').filter(Boolean) ?? [];

	// Full where clause — used for the main product query (has joins).
	// The price range is not here: it belongs to the variant-picking join below,
	// so that a product matches when *any* of its variants is in range.
	const whereClause = and(
		eq(products.isActive, true),
		search ? like(products.name, `%${search}%`) : undefined,
		selectedCats.length > 0 ? inArray(productCategories.name, selectedCats) : undefined
	);

	/**
	 * Picks the one variant a card should show: the cheapest that falls inside
	 * the requested price range.
	 *
	 * This replaces a pair of independent aggregates — `min(price)` and
	 * `min(amount)` — which came from different rows. `min(amount)` is a
	 * lexicographic minimum of a varchar and has nothing to do with the row that
	 * produced `min(price)`, so a card could show one variant's price next to
	 * another variant's label, and add the mismatched pair to the cart.
	 *
	 * Being an inner join, it also drops products with no variant in range,
	 * which is what the old `WHERE` on the left-joined `prices` did implicitly.
	 */
	const cheapestVariantInRange = sql`${prices.id} = (
		SELECT p2.id FROM prices AS p2
		WHERE p2.product_id = ${products.id}
		  AND p2.price >= ${min}
		  AND p2.price <= ${max}
		ORDER BY p2.price ASC, p2.id ASC
		LIMIT 1
	)`;

	const categories = await db
		.select({ name: productCategories.name })
		.from(productCategories)
		.groupBy(productCategories.name);

	const productsData = await db
		.select({
			productId: products.id,
			productName: products.name,
			// All three come from the same `prices` row, so the label and the
			// price a customer sees always belong to the same variant.
			priceId: prices.id,
			price: prices.price,
			amount: prices.amount,
			image: products.featuredImage,
			category: productCategories.name
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.innerJoin(prices, cheapestVariantInRange)
		.where(whereClause)
		.orderBy(asc(products.createdAt))
		.limit(pageSize)
		.offset(offset);

	// Counted over exactly the same joins and filters as the query above, so the
	// page count matches what is actually being listed. Counting only
	// `isActive` meant a four-result search still advertised six pages of
	// results, every one of them empty after the first.
	const [totalResult] = await db
		.select({ count: countDistinct(products.id) })
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.innerJoin(prices, cheapestVariantInRange)
		.where(whereClause);

	const totalCount = totalResult.count;
	// `Math.ceil(totalCount / pageSize - 1)` subtracted a whole page before
	// rounding, so the final page was unreachable: 125 products reported 6 pages
	// and the 5 on page 7 could not be seen from the UI at all.
	const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

	const productIds = productsData.map((p) => p.productId);
	const allPrices = productIds.length
		? await db.select().from(prices).where(inArray(prices.productId, productIds))
		: [];

	const productList = productsData.map((p) => ({
		...p,
		priceList: allPrices
			.filter((price) => price.productId === p.productId)
			.map((price) => ({
				// `id` is what identifies a variant everywhere downstream — the cart
				// keys on it and the server re-prices from it.
				id: price.id,
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
