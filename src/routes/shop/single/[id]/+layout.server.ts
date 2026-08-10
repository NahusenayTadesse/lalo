import { db } from '$lib/server/db';
import { productCategories, products, prices, productImages } from '$lib/server/db/schema';
import { eq, sql, and, ne, asc } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params }) => {
	// `Number('abc')` is NaN, which drizzle happily bound into every query below
	// and turned a mistyped or stale URL into a 500. Settle the id once, up front.
	const productId = Number(params.id);
	if (!Number.isInteger(productId) || productId <= 0) {
		error(404, 'Product not found');
	}

	// No aggregate here, deliberately. With `min(prices.price)` in the select and
	// no GROUP BY this was a single-row aggregate query, so MySQL always returned
	// exactly one row — full of NULLs when nothing matched. `product` was never
	// falsy, the 404 below was unreachable, and a nonexistent product rendered an
	// empty page with an undefined title. The lowest price is taken from
	// `priceList` further down instead, which is already sorted by price.
	const product = await db
		.select({
			productId: products.id,
			productName: products.name,
			description: products.description,
			category: productCategories.name,
			image: products.featuredImage,
			categoryId: products.categoryId
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.where(and(eq(products.id, productId), eq(products.isActive, true)))
		.limit(1)
		.then((rows) => rows[0]);

	if (!product) {
		error(404, 'Product not found');
	}

	const result = await db
		.select({
			url: productImages.imageUrl
		})
		.from(productImages)
		.where(eq(productImages.productId, productId));

	const images = result.map((img) => img.url);

	// Same one-row-per-product rule as the shop listing: `min(price)` and
	// `min(amount)` are unrelated aggregates and pairing them mislabels the card.
	const cheapestVariant = sql`${prices.id} = (
		SELECT p2.id FROM prices AS p2
		WHERE p2.product_id = ${products.id}
		ORDER BY p2.price ASC, p2.id ASC
		LIMIT 1
	)`;

	// A product with no category has no siblings to relate it to — and
	// `eq(column, null)` is never true in SQL, so this would silently return
	// nothing rather than erroring.
	const catProducts =
		product.categoryId === null
			? []
			: await db
					.select({
						productId: products.id,
						productName: products.name,
						priceId: prices.id,
						price: prices.price,
						amount: prices.amount,
						image: products.featuredImage,
						category: productCategories.name
					})
					.from(products)
					.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
					.innerJoin(prices, cheapestVariant)
					.where(
						and(
							eq(products.categoryId, product.categoryId),
							eq(products.isActive, true),
							ne(products.id, productId)
						)
					)
					.limit(10);

	// `id` identifies the variant downstream — the cart keys on it and checkout
	// re-prices from it. Ordered so "the first variant" means the cheapest rather
	// than whatever the database happened to return first.
	const priceList = await db
		.select({
			id: prices.id,
			amount: prices.amount,
			price: sql<number>`CAST(${prices.price} AS DOUBLE)`
		})
		.from(prices)
		.where(eq(prices.productId, productId))
		.orderBy(asc(prices.price), asc(prices.id));

	return {
		// `price` is the "from" figure used in the page's metadata. It comes off the
		// front of the already-sorted `priceList`, so it is a real variant's price
		// rather than a free-floating aggregate.
		product: { ...product, price: priceList[0]?.price ?? null },
		priceList,
		images,
		result,
		catProducts
	};
};
