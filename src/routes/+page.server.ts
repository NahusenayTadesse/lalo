import { localized, localizedOrNull } from '$lib/server/localize';
import { db } from '$lib/server/db';
import {
	testimonials as paymentMethods,
	products,
	productCategories,
	prices
} from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

/** How many products the homepage showcases; the rest are a click away in the shop. */
const FEATURED_COUNT = 8;

export const load: PageServerLoad = async () => {
	const allPaymentMethods = await db
		.select({
			id: paymentMethods.id,
			name: paymentMethods.name,
			position: localizedOrNull(paymentMethods.position, paymentMethods.positionAm),
			avatar: paymentMethods.avatar,
			testimonial: localized(paymentMethods.message, paymentMethods.messageAm)
		})
		.from(paymentMethods);

	// The newest active products, each with its cheapest variant — the same shape
	// the shop hands to `ProductCard`. The inner join skips products with no variant.
	const featuredProducts = await db
		.select({
			productId: products.id,
			productName: localized(products.name, products.nameAm),
			priceId: prices.id,
			price: prices.price,
			amount: prices.amount,
			image: products.featuredImage,
			category: localizedOrNull(productCategories.name, productCategories.nameAm)
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.innerJoin(
			prices,
			sql`${prices.id} = (
				SELECT p2.id FROM prices AS p2
				WHERE p2.product_id = ${products.id}
				ORDER BY p2.price ASC, p2.id ASC
				LIMIT 1
			)`
		)
		.where(eq(products.isActive, true))
		// Products with a photo first: the cards are mostly image.
		.orderBy(
			sql`${products.featuredImage} IS NULL`,
			desc(products.createdAt),
			desc(products.id)
		)
		.limit(FEATURED_COUNT);

	return {
		allPaymentMethods,
		featuredProducts
	};
};
