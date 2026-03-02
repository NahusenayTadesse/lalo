import { db } from '$lib/server/db';
import { products, productCategories, productSuppliers } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from '../$types';

export const load: PageServerLoad = async () => {
	let productList = await db
		.select({
			id: products.id,
			name: products.name,
			price: products.price,
			image: products.featuredImage,
			description: products.description,
			category: productCategories.name,
			quantity: products.quantity,
			supplier: productSuppliers.name
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(productSuppliers, eq(productSuppliers.id, products.supplierId))
		.groupBy(
			products.id,
			products.name,
			products.price,
			products.description,
			productCategories.name,
			products.quantity,
			productSuppliers.name
		);
	productList = productList.map((r) => ({
		...r,
		price: Number(r.price),
		quantity: Number(r.quantity)
	}));

	return {
		productList
	};
};
