import { db } from '$lib/server/db';
import { products, productCategories, productSuppliers, prices } from '$lib/server/db/schema';
import { eq, inArray, and, or, like, count } from 'drizzle-orm';
import type { PageServerLoad } from '../$types';

const DEFAULT_PAGE_SIZE = 20;
const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search')?.trim() ?? '';
	const category = url.searchParams.get('category');
	const parsedPage = parseInt(url.searchParams.get('page') ?? '1');
	const page = Math.max(1, Number.isFinite(parsedPage) ? parsedPage : 1);
	const pageSizeParam = parseInt(url.searchParams.get('pageSize') ?? '');
	const pageSize = ALLOWED_PAGE_SIZES.includes(pageSizeParam) ? pageSizeParam : DEFAULT_PAGE_SIZE;
	const offset = (page - 1) * pageSize;

	const whereClause = and(
		eq(products.isActive, true),
		search
			? or(like(products.name, `%${search}%`), like(products.description, `%${search}%`))
			: undefined,
		category ? eq(products.categoryId, Number(category)) : undefined
	);

	const categories = await db
		.select({ value: productCategories.id, name: productCategories.name })
		.from(productCategories);

	// First, get products
	const productsData = await db
		.select({
			id: products.id,
			name: products.name,
			image: products.featuredImage,
			category: productCategories.name,
			description: products.description,
			quantity: products.quantity,
			supplier: productSuppliers.name
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(productSuppliers, eq(productSuppliers.id, products.supplierId))
		.where(whereClause)
		.limit(pageSize)
		.offset(offset);

	const [{ total }] = await db
		.select({ total: count(products.id) })
		.from(products)
		.where(whereClause);
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	// Then, get prices for those products
	const productIds = productsData.map((p) => p.id);
	const relevantPrices = productIds.length
		? await db.select().from(prices).where(inArray(prices.productId, productIds))
		: [];

	// Merge in application code
	const productList = productsData.map((p) => ({
		...p,
		priceList: relevantPrices
			.filter((price) => price.productId === p.id)
			.map((price) => ({
				amount: price.amount + ' Pieces',
				price: 'ETB ' + price.price
			}))
	}));

	return {
		productList,
		categories,
		filters: { search, category, pageSize },
		pagination: {
			currentPage: page,
			totalPages,
			totalCount: total,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1
		}
	};
};
