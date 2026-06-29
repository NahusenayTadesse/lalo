import { db } from '$lib/server/db';
import { productCategories, products, prices, productImages } from '$lib/server/db/schema';
import { eq, sql, min, and, ne } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params }) => {
	const { id } = params;

	const result = await db
		.select({
			url: productImages.imageUrl
		})
		.from(productImages)
		.where(eq(productImages.productId, Number(id)));

	const images = result.map((img) => img.url);

	const product = await db
		.select({
			productId: products.id,
			productName: products.name,
			price: min(prices.price),
			description: products.description,
			category: productCategories.name,
			image: products.featuredImage,
			categoryId: products.categoryId
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(prices, eq(prices.productId, products.id))
		.where(and(eq(products.id, Number(id)), eq(products.isActive, true)))
		.limit(1)
		.then((rows) => rows[0]);

	if (!product) {
		error(404, 'Product not found');
	}

	  	const catProducts = await db
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
		.innerJoin(prices, eq(prices.productId, products.id))
		.where(and(eq(products.categoryId, product.categoryId), eq(products.isActive, true), ne(products.id, Number(id))))
		.limit(10)
		.groupBy(products.id, productCategories.name)
	  

	const priceList = await db
		.select({
			amount: prices.amount,
			price: sql<number>`CAST(${prices.price} AS DOUBLE)`
		})
		.from(prices)
		.where(eq(prices.productId, Number(id)));

	return {
		product,
		priceList,
		images,
		result,
		catProducts
	};
};
