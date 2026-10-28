import {
	mysqlTable,
	int,
	varchar,
	boolean,
	mysqlEnum,
	decimal,
	text,
	timestamp,
	datetime,
	date,
	index,
	uniqueIndex
} from 'drizzle-orm/mysql-core';
import { secureFields, user } from './auth.schema';

export const paymentMethods = mysqlTable('payment_methods', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 100 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	...secureFields
});
export const freeDelivery = mysqlTable('free_delivery', {
	suggestionThreshold: decimal('suggestion_threshold', { precision: 10, scale: 2 }).notNull(),
	threshold: decimal('threshold', { precision: 10, scale: 2 }).notNull()
});

export const placeNames = mysqlTable('place_names', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 100 }).notNull().unique(),
	// Amharic translation, shown on the public site when the visitor picks Amharic.
	// Optional: an empty value falls back to the English column.
	nameAm: varchar('name_am', { length: 100 }),
	fee: decimal('fee', { precision: 10, scale: 2 }).notNull(),
	...secureFields
});

export const products = mysqlTable('products', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 50 }).notNull(),
	featuredImage: varchar('featured_image', { length: 255 }),
	description: varchar('description', { length: 255 }),
	// Amharic translation, shown on the public site when the visitor picks Amharic.
	// Optional: an empty value falls back to the English column.
	nameAm: varchar('name_am', { length: 255 }),
	descriptionAm: text('description_am'),
	categoryId: int('category_id').references(() => productCategories.id, { onDelete: 'set null' }),
	// Cached total of the product's variants' stock, kept in step by
	// `$lib/server/inventory`. Stock itself lives on the variants and their batches.
	quantity: int('quantity').notNull().default(0),
	commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 }).notNull(),
	supplierId: int('supplier_id').references(() => productSuppliers.id),
	// The default reorder alert for variants that don't set their own.
	reorderLevel: int('reorder_level'),
	...secureFields
});

/**
 * A product's variants — one row per package ("500g", "12 pieces") with its price.
 * The table predates variant stock, hence the name. Each variant carries its own
 * stock, the cached sum of its batches' `quantityRemaining`.
 */
export const prices = mysqlTable('prices', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id').references(() => products.id, { onDelete: 'cascade' }),
	price: decimal('price', { precision: 10, scale: 2 }).notNull(),
	amount: varchar('amount', { length: 255 }).notNull(),
	sku: varchar('sku', { length: 64 }).unique(),
	quantity: int('quantity').notNull().default(0),
	// NULL falls back to the product's `reorderLevel`.
	reorderLevel: int('reorder_level')
});

/**
 * One delivery of one variant. Stock only arrives as a batch, and leaves from
 * batches earliest-expiry-first; `quantityRemaining` is what is left of it.
 */
export const stockBatches = mysqlTable(
	'stock_batches',
	{
		id: int('id').primaryKey().autoincrement(),
		variantId: int('variant_id')
			.notNull()
			.references(() => prices.id, { onDelete: 'cascade' }),
		batchNumber: varchar('batch_number', { length: 64 }).notNull(),
		quantityReceived: int('quantity_received').notNull(),
		quantityRemaining: int('quantity_remaining').notNull(),
		costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }),
		supplierId: int('supplier_id').references(() => productSuppliers.id, { onDelete: 'set null' }),
		manufacturedAt: date('manufactured_at', { mode: 'string' }),
		expiresAt: date('expires_at', { mode: 'string' }),
		receivedAt: datetime('received_at').notNull(),
		// The purchase receipt, when one was uploaded.
		transactionId: int('transaction_id').references(() => transactions.id, {
			onDelete: 'set null'
		}),
		notes: varchar('notes', { length: 255 }),
		...secureFields
	},
	(table) => [
		uniqueIndex('stock_batches_variant_batch_number_uq').on(table.variantId, table.batchNumber),
		index('stock_batches_variant_expiry_idx').on(table.variantId, table.expiresAt)
	]
);

export const productImages = mysqlTable('product_images', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id').references(() => products.id, { onDelete: 'cascade' }),
	imageUrl: varchar('image_url', { length: 255 }).notNull()
});

export const customers = mysqlTable('customers', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 100 }).notNull(),
	// Both nullable: staff add walk-in customers who have no account and often no
	// email. UNIQUE still holds — MySQL allows repeated NULLs in a unique index.
	email: varchar('email', { length: 100 }).unique(),
	phone: varchar('phone', { length: 20 }),
	userId: varchar('user_id', { length: 255 }).references(() => user.id),
	address: varchar('address', { length: 255 }),
	deliveryAddress: varchar('delivery_address', { length: 255 }),
	...secureFields
});

export const discounts = mysqlTable('discounts', {
	id: int('id').primaryKey().autoincrement(),
	amount: decimal('amount', { precision: 10, scale: 2 }),
	productId: int('product_id').references(() => products.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 50 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	// Amharic translation, shown on the public site when the visitor picks Amharic.
	// Optional: an empty value falls back to the English column.
	nameAm: varchar('name_am', { length: 255 }),
	descriptionAm: text('description_am'),
	...secureFields
});

export const productCategories = mysqlTable('product_categories', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	// Amharic translation, shown on the public site when the visitor picks Amharic.
	// Optional: an empty value falls back to the English column.
	nameAm: varchar('name_am', { length: 255 }),
	descriptionAm: text('description_am'),
	...secureFields
});

export const transactions = mysqlTable(
	'transactions',
	{
		id: int('id').primaryKey().autoincrement(),
		amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
		paymentStatus: mysqlEnum('payment_status', [
			'pending',
			'paid',
			'unpaid',
			'refunded',
			'partially_paid',
			'partially_refunded',
			'overpaid',
			'disputed'
		]).default('pending'),
		paymentMethodId: int('payment_method_id').references(() => paymentMethods.id, {
			onDelete: 'set null'
		}),
		recieptLink: varchar('reciept_link', { length: 255 }),
		...secureFields
	},
	// `/files/[name]` looks receipts up by file name on every file request.
	(table) => [index('transactions_reciept_link_idx').on(table.recieptLink)]
);
/**
 * The stock ledger: one row per change to one batch. Rows from before variant
 * stock have no `variantId`/`batchId` and describe the product as a whole.
 */
export const productAdjustments = mysqlTable(
	'product_adjustments',
	{
		id: int('id').autoincrement().primaryKey(),
		productsId: int('product_id')
			.notNull()
			.references(() => products.id, { onDelete: 'cascade' }),
		variantId: int('variant_id').references(() => prices.id, { onDelete: 'set null' }),
		batchId: int('batch_id').references(() => stockBatches.id, { onDelete: 'set null' }),
		orderId: int('order_id').references(() => orders.id, { onDelete: 'set null' }),
		type: mysqlEnum('type', ['receive', 'sale', 'return', 'damage', 'correction']),
		supplierId: int('supplier_id').references(() => productSuppliers.id),
		adjustment: int('adjustment').notNull(), // e.g., +50 for new stock, -1 for a sale, -1 for internal use
		// The variant's stock straight after this change.
		balanceAfter: int('balance_after'),
		reason: varchar('reason', { length: 255 }),
		transactionId: int('transaction_id').references(() => transactions.id), // Link directly to the sale that caused the adjustment
		...secureFields
	},
	(table) => [
		index('product_adjustments_variant_idx').on(table.variantId),
		index('product_adjustments_batch_idx').on(table.batchId)
	]
);

export const orders = mysqlTable('orders', {
	id: int('id').autoincrement().primaryKey(),
	customerId: int('customer_id').references(() => customers.id),
	status: mysqlEnum('status', ['pending', 'delivered', 'cancelled']),
	transactionId: int('transaction_id').references(() => transactions.id),
	address: varchar('address', { length: 255 }),
	deliveryAddress: varchar('delivery_address', { length: 255 }),
	fee: decimal('fee', { precision: 10, scale: 2 }),
	// When the order last became delivered — `createdAt` is when it was placed, and
	// "today's deliveries" can't be read off that. NULL for every other status.
	deliveredAt: datetime('delivered_at'),
	...secureFields
});

export const orderItems = mysqlTable('order_items', {
	id: int('id').autoincrement().primaryKey(),
	orderId: int('order_id').references(() => orders.id),
	productId: int('product_id').references(() => products.id),
	// The variant sold. `amount` and `price` stay as the snapshot printed on the
	// order; this is what stock is taken from. NULL only on rows whose variant has
	// since been deleted.
	priceId: int('price_id').references(() => prices.id, { onDelete: 'set null' }),
	quantity: int('quantity').notNull(),
	price: decimal('price', { precision: 10, scale: 2 }).notNull(),
	amount: varchar('amount', { length: 255 }).notNull(),
	...secureFields
});

/**
 * Which batches a delivered order's units came out of. Undelivering, editing or
 * deleting the order puts them back into those same batches.
 */
export const orderBatchAllocations = mysqlTable(
	'order_batch_allocations',
	{
		id: int('id').primaryKey().autoincrement(),
		orderId: int('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		variantId: int('variant_id')
			.notNull()
			.references(() => prices.id, { onDelete: 'cascade' }),
		batchId: int('batch_id')
			.notNull()
			.references(() => stockBatches.id, { onDelete: 'cascade' }),
		quantity: int('quantity').notNull()
	},
	(table) => [index('order_batch_allocations_order_idx').on(table.orderId)]
);

/**
 * The drivers staff pick from when dispatching. A delivery copies the driver's
 * details at dispatch, so editing or retiring a driver never rewrites history,
 * and a one-off hired driver can be typed in without being saved here.
 */
export const deliveryDrivers = mysqlTable('delivery_drivers', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 100 }).notNull(),
	phone: varchar('phone', { length: 20 }).notNull(),
	vehiclePlate: varchar('vehicle_plate', { length: 20 }),
	vehicleType: varchar('vehicle_type', { length: 50 }),
	notes: varchar('notes', { length: 255 }),
	...secureFields
});

export const DELIVERY_STATUSES = [
	'ready',
	'dispatched',
	'delivered',
	'failed',
	'cancelled'
] as const;

/**
 * One order's trip to the customer; at most one per order. `$lib/server/deliveries`
 * owns every change to it:
 *
 *   ready ─dispatch→ dispatched ─deliver→ delivered
 *     ↑                  │ fail                │ reopen
 *     └──── requeue ── failed     dispatched ←─┘
 *
 * Stock leaves at dispatch — that is when the goods leave the shop, and the batch
 * allocations then say exactly which batches went out on the truck. A failed trip
 * puts them back; `orders.status` turns `delivered` only on delivery.
 *
 * The destination and driver are snapshots, taken when the delivery is queued and
 * dispatched, so a customer moving house later doesn't move past deliveries.
 */
export const deliveries = mysqlTable(
	'deliveries',
	{
		id: int('id').primaryKey().autoincrement(),
		orderId: int('order_id')
			.notNull()
			.unique()
			.references(() => orders.id, { onDelete: 'cascade' }),
		status: mysqlEnum('status', DELIVERY_STATUSES).notNull().default('ready'),
		method: mysqlEnum('method', ['delivery', 'pickup']).notNull().default('delivery'),
		area: varchar('area', { length: 255 }),
		address: varchar('address', { length: 255 }),
		recipientName: varchar('recipient_name', { length: 100 }),
		recipientPhone: varchar('recipient_phone', { length: 20 }),
		driverId: int('driver_id').references(() => deliveryDrivers.id, { onDelete: 'set null' }),
		driverName: varchar('driver_name', { length: 100 }),
		driverPhone: varchar('driver_phone', { length: 20 }),
		vehiclePlate: varchar('vehicle_plate', { length: 20 }),
		vehicleType: varchar('vehicle_type', { length: 50 }),
		// The arrival time promised to the customer.
		scheduledFor: datetime('scheduled_for'),
		dispatchedAt: datetime('dispatched_at'),
		// Who approved the goods leaving the shop.
		dispatchedBy: varchar('dispatched_by', { length: 255 }).references(() => user.id, {
			onDelete: 'set null'
		}),
		deliveredAt: datetime('delivered_at'),
		// Who confirmed the hand-over: a staff member, or the customer themselves.
		confirmedBy: varchar('confirmed_by', { length: 255 }).references(() => user.id, {
			onDelete: 'set null'
		}),
		confirmedVia: mysqlEnum('confirmed_via', ['staff', 'customer']),
		receivedBy: varchar('received_by', { length: 100 }),
		// A photo of the signed delivery note, in the uploads folder.
		proofLink: varchar('proof_link', { length: 255 }),
		// Cash the driver has to collect: what was still unpaid when it was queued.
		cashToCollect: decimal('cash_to_collect', { precision: 10, scale: 2 }),
		attempts: int('attempts').notNull().default(0),
		failureReason: varchar('failure_reason', { length: 255 }),
		notes: varchar('notes', { length: 500 }),
		...secureFields
	},
	(table) => [
		index('deliveries_status_idx').on(table.status),
		index('deliveries_driver_idx').on(table.driverId),
		index('deliveries_dispatched_at_idx').on(table.dispatchedAt)
	]
);

/** Everything that happened to a delivery, and who did it, for the audit trail. */
export const deliveryEvents = mysqlTable(
	'delivery_events',
	{
		id: int('id').primaryKey().autoincrement(),
		deliveryId: int('delivery_id')
			.notNull()
			.references(() => deliveries.id, { onDelete: 'cascade' }),
		// queued, dispatched, delivered, failed, requeued, reopened, cancelled, updated
		event: varchar('event', { length: 32 }).notNull(),
		note: varchar('note', { length: 255 }),
		userId: varchar('user_id', { length: 255 }).references(() => user.id, {
			onDelete: 'set null'
		}),
		byCustomer: boolean('by_customer').notNull().default(false),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('delivery_events_delivery_idx').on(table.deliveryId)]
);

export const damagedProducts = mysqlTable('damaged_products', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	variantId: int('variant_id').references(() => prices.id, { onDelete: 'set null' }),
	batchId: int('batch_id').references(() => stockBatches.id, { onDelete: 'set null' }),
	quantity: int('quantity').notNull(),
	damagedBy: varchar('damaged_by', { length: 36 }).notNull(),
	reason: varchar('reason', { length: 255 }).notNull(),
	...secureFields
});

export const productSuppliers = mysqlTable('product_suppliers', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 50 }).notNull(),
	phone: varchar('phone', { length: 20 }).notNull(),
	email: varchar('email', { length: 100 }),
	description: varchar('description', { length: 255 }),
	...secureFields
});

export const recipes = mysqlTable('recipes', {
	id: int('id').primaryKey().autoincrement(),
	title: varchar('title', { length: 255 }).notNull(),
	description: text('description'),
	instructions: text('instructions').notNull(), // Can store markdown or JSON steps
	// Amharic translation, shown on the public site when the visitor picks Amharic.
	// Optional: an empty value falls back to the English column.
	titleAm: varchar('title_am', { length: 255 }),
	descriptionAm: text('description_am'),
	instructionsAm: text('instructions_am'),
	prepTime: int('prep_time'), // in minutes
	cookTime: int('cook_time'), // in minutes
	featuredImage: varchar('featured_image', { length: 255 }),
	...secureFields
});

export const ingredients = mysqlTable('ingredients', {
	id: int('id').primaryKey().autoincrement()
});

// Join table for Recipes and Ingredients
export const recipeIngredients = mysqlTable('recipe_ingredients', {
	id: int('id').primaryKey().autoincrement(),
	recipeId: int('recipe_id').references(() => recipes.id),
	name: varchar('name', { length: 255 }).notNull(),
	amount: varchar('amount', { length: 100 }),
	// Amharic translation, shown on the public site when the visitor picks Amharic.
	// Optional: an empty value falls back to the English column.
	nameAm: varchar('name_am', { length: 255 }),
	amountAm: varchar('amount_am', { length: 100 })
});

export const contactMessages = mysqlTable('contact_messages', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	email: varchar('email', { length: 100 }).notNull(),
	phone: varchar('phone', { length: 20 }),
	subject: varchar('subject', { length: 255 }).notNull(),
	message: text('message').notNull(),
	address: varchar('address', { length: 255 }),
	seen: boolean('seen').default(false),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const testimonials = mysqlTable('testimonials', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	position: varchar('position', { length: 255 }),
	message: text('message').notNull(),
	// Amharic translation, shown on the public site when the visitor picks Amharic.
	// Optional: an empty value falls back to the English column.
	positionAm: varchar('position_am', { length: 255 }),
	messageAm: text('message_am'),
	avatar: varchar('avatar', { length: 255 }),
	...secureFields
});

export const gallery = mysqlTable('gallery', {
	id: int('id').primaryKey().autoincrement(),
	imageUrl: varchar('image_url', { length: 255 })
});

export const catalogManual = mysqlTable('catalog_manual', {
	catalog: varchar('catalog', { length: 255 }),
	manual: varchar('manual', { length: 255 })
});

export * from './auth.schema';
