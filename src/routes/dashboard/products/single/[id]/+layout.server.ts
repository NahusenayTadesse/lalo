import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { edit, adjust, damaged, editGallery, editPrice, addPrice } from './schema';

import { db } from '$lib/server/db';
import {
	productCategories,
	products,
	user,
	productSuppliers as suppliers,
	orderItems,
	orders,
	prices,
	productImages
} from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const { id } = params;
	const form = await superValidate(zod4(edit));
	const adjustForm = await superValidate(zod4(adjust));
	const damagedForm = await superValidate(zod4(damaged));
	const galleryEdit = await superValidate(zod4(editGallery));
	const priceEdit = await superValidate(zod4(editPrice));
	const priceAdd = await superValidate(zod4(addPrice));

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

	// Computed as separate scalar queries rather than joined into the product row —
	// joining `prices` (one row per variant) and `orderItems` (one row per sale) onto a
	// single product row fans out before the GROUP BY, inflating both aggregates.
	const [priceRange] = await db
		.select({ price: sql<number>`MIN(${prices.price})` })
		.from(prices)
		.where(eq(prices.productId, Number(id)));

	const [saleStats] = await db
		.select({ saleCount: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)` })
		.from(orderItems)
		.innerJoin(orders, eq(orderItems.orderId, orders.id))
		.where(and(eq(orderItems.productId, Number(id)), eq(orders.status, 'delivered')));

	const product = await db
		.select({
			id: products.id,
			name: products.name,
			description: products.description,
			category: productCategories.name,
			categoryId: productCategories.id,
			quantity: products.quantity,
			reorderLevel: products.reorderLevel,
			supplier: suppliers.name,
			supplierId: suppliers.id,
			image: products.featuredImage,
			createdBy: user.name,
			createdAt: sql<string>`DATE_FORMAT(${products.createdAt}, '%Y-%m-%d')`
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(suppliers, eq(suppliers.id, products.supplierId))
		.leftJoin(user, eq(products.createdBy, user.id))
		.where(eq(products.id, Number(id)))
		.then((rows) => rows[0])
		.then((row) =>
			row ? { ...row, price: priceRange?.price ?? null, saleCount: saleStats?.saleCount ?? 0 } : row
		);

	if (!product) {
		error(404, 'Product not found');
	}

	const priceList = await db
		.select({
			id: prices.id,
			amount: prices.amount,
			price: sql<number>`CAST(${prices.price} AS DOUBLE)`
		})
		.from(prices)
		.where(eq(prices.productId, Number(id)));

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
		images,
		priceList,
		priceEdit,
		priceAdd
	};
};
