CREATE TABLE `order_batch_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`variant_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`quantity` int NOT NULL,
	CONSTRAINT `order_batch_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`variant_id` int NOT NULL,
	`batch_number` varchar(64) NOT NULL,
	`quantity_received` int NOT NULL,
	`quantity_remaining` int NOT NULL,
	`cost_per_unit` decimal(10,2),
	`supplier_id` int,
	`manufactured_at` date,
	`expires_at` date,
	`received_at` datetime NOT NULL,
	`transaction_id` int,
	`notes` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `stock_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `stock_batches_variant_batch_number_uq` UNIQUE(`variant_id`,`batch_number`)
);
--> statement-breakpoint
ALTER TABLE `damaged_products` ADD `variant_id` int;--> statement-breakpoint
ALTER TABLE `damaged_products` ADD `batch_id` int;--> statement-breakpoint
ALTER TABLE `order_items` ADD `price_id` int;--> statement-breakpoint
ALTER TABLE `prices` ADD `sku` varchar(64);--> statement-breakpoint
ALTER TABLE `prices` ADD `quantity` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `prices` ADD `reorder_level` int;--> statement-breakpoint
ALTER TABLE `product_adjustments` ADD `variant_id` int;--> statement-breakpoint
ALTER TABLE `product_adjustments` ADD `batch_id` int;--> statement-breakpoint
ALTER TABLE `product_adjustments` ADD `order_id` int;--> statement-breakpoint
ALTER TABLE `product_adjustments` ADD `type` enum('receive','sale','return','damage','correction');--> statement-breakpoint
ALTER TABLE `product_adjustments` ADD `balance_after` int;--> statement-breakpoint
ALTER TABLE `prices` ADD CONSTRAINT `prices_sku_unique` UNIQUE(`sku`);--> statement-breakpoint
ALTER TABLE `order_batch_allocations` ADD CONSTRAINT `order_batch_allocations_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_batch_allocations` ADD CONSTRAINT `order_batch_allocations_variant_id_prices_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `prices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_batch_allocations` ADD CONSTRAINT `order_batch_allocations_batch_id_stock_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `stock_batches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_variant_id_prices_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `prices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_supplier_id_product_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `product_suppliers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `order_batch_allocations_order_idx` ON `order_batch_allocations` (`order_id`);--> statement-breakpoint
CREATE INDEX `stock_batches_variant_expiry_idx` ON `stock_batches` (`variant_id`,`expires_at`);--> statement-breakpoint
ALTER TABLE `damaged_products` ADD CONSTRAINT `damaged_products_variant_id_prices_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `prices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `damaged_products` ADD CONSTRAINT `damaged_products_batch_id_stock_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `stock_batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_price_id_prices_id_fk` FOREIGN KEY (`price_id`) REFERENCES `prices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_adjustments` ADD CONSTRAINT `product_adjustments_variant_id_prices_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `prices`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_adjustments` ADD CONSTRAINT `product_adjustments_batch_id_stock_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `stock_batches`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_adjustments` ADD CONSTRAINT `product_adjustments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `product_adjustments_variant_idx` ON `product_adjustments` (`variant_id`);--> statement-breakpoint
CREATE INDEX `product_adjustments_batch_idx` ON `product_adjustments` (`batch_id`);--> statement-breakpoint
-- Data: link order items to the variant they sold. Exact match first; then, for
-- rows whose price has since been edited, the variant with the same label.
UPDATE `order_items` oi
	JOIN `prices` p ON p.`product_id` = oi.`product_id` AND p.`amount` = oi.`amount` AND p.`price` = oi.`price`
	SET oi.`price_id` = p.`id`
	WHERE oi.`price_id` IS NULL;--> statement-breakpoint
UPDATE `order_items` oi
	SET oi.`price_id` = (SELECT MIN(p.`id`) FROM `prices` p WHERE p.`product_id` = oi.`product_id` AND p.`amount` = oi.`amount`)
	WHERE oi.`price_id` IS NULL;--> statement-breakpoint
-- Data: an OPENING batch carries each product's old product-level stock, on its
-- first variant. Variants that delivered orders sold from get one too (empty),
-- so those orders have a batch to return stock to if they are un-delivered.
INSERT INTO `stock_batches` (`variant_id`, `batch_number`, `quantity_received`, `quantity_remaining`, `received_at`, `notes`)
	SELECT p.`id`, 'OPENING',
		IF(p.`id` = f.`first_id`, GREATEST(pr.`quantity`, 0), 0),
		IF(p.`id` = f.`first_id`, GREATEST(pr.`quantity`, 0), 0),
		NOW(), 'Opening balance carried over from product-level stock'
	FROM `prices` p
	JOIN `products` pr ON pr.`id` = p.`product_id`
	JOIN (SELECT `product_id`, MIN(`id`) AS `first_id` FROM `prices` GROUP BY `product_id`) f ON f.`product_id` = p.`product_id`
	WHERE ((p.`id` = f.`first_id` AND pr.`quantity` > 0)
		OR EXISTS (SELECT 1 FROM `order_items` oi JOIN `orders` o ON o.`id` = oi.`order_id`
			WHERE oi.`price_id` = p.`id` AND o.`status` = 'delivered'))
		AND NOT EXISTS (SELECT 1 FROM `stock_batches` b WHERE b.`variant_id` = p.`id` AND b.`batch_number` = 'OPENING');--> statement-breakpoint
-- Data: record what each delivered order already took, against the OPENING batch.
INSERT INTO `order_batch_allocations` (`order_id`, `variant_id`, `batch_id`, `quantity`)
	SELECT oi.`order_id`, oi.`price_id`, b.`id`, SUM(oi.`quantity`)
	FROM `order_items` oi
	JOIN `orders` o ON o.`id` = oi.`order_id` AND o.`status` = 'delivered'
	JOIN `stock_batches` b ON b.`variant_id` = oi.`price_id` AND b.`batch_number` = 'OPENING'
	WHERE NOT EXISTS (SELECT 1 FROM `order_batch_allocations` a WHERE a.`order_id` = oi.`order_id`)
	GROUP BY oi.`order_id`, oi.`price_id`, b.`id`;--> statement-breakpoint
-- Data: cached totals. A product with no variants keeps its old figure, since
-- there is nowhere to put that stock until it gets one.
UPDATE `prices` p
	SET p.`quantity` = (SELECT COALESCE(SUM(b.`quantity_remaining`), 0) FROM `stock_batches` b WHERE b.`variant_id` = p.`id`);--> statement-breakpoint
UPDATE `products` pr
	SET pr.`quantity` = (SELECT COALESCE(SUM(p.`quantity`), 0) FROM `prices` p WHERE p.`product_id` = pr.`id`)
	WHERE EXISTS (SELECT 1 FROM `prices` p WHERE p.`product_id` = pr.`id`);
