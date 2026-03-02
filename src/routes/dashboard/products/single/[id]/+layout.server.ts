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
	const form = await superValidate(zod4(edit));
	const adjustForm = await superValidate(zod4(adjust));
	const damagedForm = await superValidate(zod4(damaged));
	const galleryEdit = await superValidate(zod4(editGallery));

	const allCategories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.where(eq(productCategories.isActive, true));

	const supplierList = await db
		.select({
			value: suppliers.id,
			name: suppliers.name
		})
		.from(suppliers)
		.where(eq(suppliers.isActive, true));

	const result = await db
		.select({
			url: productImages.imageUrl
		})
		.from(productImages)
		.where(eq(productImages.productId, Number(id)));

	const images = result.map((img) => img.url);

	const product = await db
		.select({
			id: products.id,
			name: products.name,
			price: products.price,
			description: products.description,
			category: productCategories.name,
			categoryId: productCategories.id,
			quantity: products.quantity,
			reorderLevel: products.reorderLevel,
			supplier: suppliers.name,
			supplierId: suppliers.id,
			image: products.featuredImage,
			saleCount: sql<number>`SUM(${orderItems.quantity})`,
			createdBy: user.name,
			createdAt: sql<string>`DATE_FORMAT(${products.createdAt}, '%Y-%m-%d')`
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(suppliers, eq(suppliers.id, products.supplierId))
		.leftJoin(orderItems, eq(products.id, orderItems.productId))
		.leftJoin(orders, and(eq(orderItems.orderId, orders.id), eq(orders.status, 'delivered')))
		.leftJoin(user, eq(products.createdBy, user.id))
		.where(eq(products.id, Number(id)))
		.groupBy(
			products.id,
			products.name,
			products.price,
			orderItems.quantity,
			products.description,
			productCategories.name,
			products.quantity,
			suppliers.name,
			products.reorderLevel
		)
		.then((rows) => rows[0]);

	const categories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories);

	return {
		product,
		form,
		categories,
		adjustForm,
		galleryEdit,
		supplierList,
		damagedForm,
		allCategories,
		images
	};
};
