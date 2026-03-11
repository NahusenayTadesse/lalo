import { db } from '$lib/server/db';
import { products, productCategories, prices, user, roles } from '$lib/server/db/schema';
import { eq, min } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const currentUser = locals?.user;
	let roleName = ''; // Initialize with a default value

	// 1. Fetch the role name if a user exists
	if (currentUser) {
		const roleData = await db
			.select({ name: roles.name })
			.from(user)
			.leftJoin(roles, eq(user.roleId, roles.id))
			.where(eq(user.id, currentUser.id))
			.then((rows) => rows[0]);

		roleName = roleData?.name ?? '';
	}

	// 2. Fetch the product list (this now always runs)
	const productsData = await db
		.select({
			productId: products.id,
			productName: products.name,
			price: min(prices.price),
			amount: min(prices.amount),
			image: products.featuredImage,
			category: productCategories.name
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		// Join the prices table to access the price rows
		.leftJoin(prices, eq(prices.productId, products.id))
		.where(eq(products.isActive, true))
		// We must group by the product ID to ensure the min() function
		// calculates the lowest price per individual product
		.groupBy(products.id, productCategories.name);

	const allPrices = await db.select().from(prices);

	const productList = productsData.map((p) => ({
		...p,
		priceList: allPrices
			.filter((price) => price.productId === p.productId) // use productId here too
			.map((price) => ({
				amount: price.amount,
				price: price.price
			}))
	}));

	// 3. Return everything at once
	return {
		productList,
		roleName,
		user: currentUser
	};
};
