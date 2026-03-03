import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { edit, adjust, damaged, editGallery } from './schema';

import { db } from '$lib/server/db';
import {
	productCategories,
	products,
	user,
	productSuppliers as suppliers,
	orderItems,
	orders,
	productImages
} from '$lib/server/db/schema';
import { eq, and, sql, isNotNull, desc } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
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
			price: products.price,
			description: products.description,
			category: productCategories.name,
			image: products.featuredImage
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.where(eq(products.id, Number(id)))
		.then((rows) => rows[0]);

	return {
		product,
		images,
		result
	};
};
