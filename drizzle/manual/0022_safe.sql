-- Migration 0022 (variant stock and batches) as one script that is safe to run
-- more than once, including after an earlier attempt stopped part-way. Every
-- step checks information_schema first and uses plain SQL with prepared
-- statements only, so it pastes into phpMyAdmin and runs on MariaDB and MySQL.
--
-- What it does to the data:
--   * links each order item to the variant it sold (`order_items.price_id`);
--   * moves each product's stock onto its first variant, as a batch numbered
--     OPENING. Recount and correct it per variant afterwards;
--   * records what every delivered order already took, so un-delivering one
--     still puts its units back.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `prices` ADD COLUMN `sku` varchar(64)',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prices' AND COLUMN_NAME = 'sku');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `prices` ADD COLUMN `quantity` int NOT NULL DEFAULT 0',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prices' AND COLUMN_NAME = 'quantity');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `prices` ADD COLUMN `reorder_level` int',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prices' AND COLUMN_NAME = 'reorder_level');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `order_items` ADD COLUMN `price_id` int',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'price_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `damaged_products` ADD COLUMN `variant_id` int',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'damaged_products' AND COLUMN_NAME = 'variant_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `damaged_products` ADD COLUMN `batch_id` int',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'damaged_products' AND COLUMN_NAME = 'batch_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `product_adjustments` ADD COLUMN `variant_id` int',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND COLUMN_NAME = 'variant_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `product_adjustments` ADD COLUMN `batch_id` int',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND COLUMN_NAME = 'batch_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `product_adjustments` ADD COLUMN `order_id` int',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND COLUMN_NAME = 'order_id');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `product_adjustments` ADD COLUMN `type` enum(''receive'',''sale'',''return'',''damage'',''correction'')',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND COLUMN_NAME = 'type');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `product_adjustments` ADD COLUMN `balance_after` int',
	'DO 0')
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND COLUMN_NAME = 'balance_after');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `prices` ADD CONSTRAINT `prices_sku_unique` UNIQUE (`sku`)',
	'DO 0')
	FROM information_schema.STATISTICS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prices' AND INDEX_NAME = 'prices_sku_unique');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Tables. Given `user`.`id`'s charset and collation, which their foreign keys
-- to `user` need (see the other scripts here).
-- ---------------------------------------------------------------------------

SET @user_charset = (SELECT CHARACTER_SET_NAME FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'id');
SET @user_collation = (SELECT COLLATION_NAME FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'id');

SET @sql = CONCAT(
	'CREATE TABLE IF NOT EXISTS `stock_batches` (',
	'`id` int NOT NULL AUTO_INCREMENT,',
	'`variant_id` int NOT NULL,',
	'`batch_number` varchar(64) NOT NULL,',
	'`quantity_received` int NOT NULL,',
	'`quantity_remaining` int NOT NULL,',
	'`cost_per_unit` decimal(10,2),',
	'`supplier_id` int,',
	'`manufactured_at` date,',
	'`expires_at` date,',
	'`received_at` datetime NOT NULL,',
	'`transaction_id` int,',
	'`notes` varchar(255),',
	'`is_active` boolean NOT NULL DEFAULT true,',
	'`created_by` varchar(255),',
	'`updated_by` varchar(255),',
	'`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,',
	'`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,',
	'`deleted_at` datetime,',
	'`deleted_by` varchar(255),',
	'PRIMARY KEY (`id`),',
	'UNIQUE KEY `stock_batches_variant_batch_number_uq` (`variant_id`, `batch_number`),',
	'KEY `stock_batches_variant_expiry_idx` (`variant_id`, `expires_at`)',
	') ENGINE=InnoDB DEFAULT CHARSET=', @user_charset, ' COLLATE=', @user_collation);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `order_batch_allocations` (
	`id` int NOT NULL AUTO_INCREMENT,
	`order_id` int NOT NULL,
	`variant_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`quantity` int NOT NULL,
	PRIMARY KEY (`id`),
	KEY `order_batch_allocations_order_idx` (`order_id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Foreign keys and indexes
-- ---------------------------------------------------------------------------

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_variant_id_prices_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `prices`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_batches' AND CONSTRAINT_NAME = 'stock_batches_variant_id_prices_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_supplier_id_product_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `product_suppliers`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_batches' AND CONSTRAINT_NAME = 'stock_batches_supplier_id_product_suppliers_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_batches' AND CONSTRAINT_NAME = 'stock_batches_transaction_id_transactions_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_batches' AND CONSTRAINT_NAME = 'stock_batches_created_by_user_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_batches' AND CONSTRAINT_NAME = 'stock_batches_updated_by_user_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `stock_batches` ADD CONSTRAINT `stock_batches_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_batches' AND CONSTRAINT_NAME = 'stock_batches_deleted_by_user_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `order_batch_allocations` ADD CONSTRAINT `order_batch_allocations_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_batch_allocations' AND CONSTRAINT_NAME = 'order_batch_allocations_order_id_orders_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `order_batch_allocations` ADD CONSTRAINT `order_batch_allocations_variant_id_prices_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `prices`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_batch_allocations' AND CONSTRAINT_NAME = 'order_batch_allocations_variant_id_prices_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `order_batch_allocations` ADD CONSTRAINT `order_batch_allocations_batch_id_stock_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `stock_batches`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_batch_allocations' AND CONSTRAINT_NAME = 'order_batch_allocations_batch_id_stock_batches_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `damaged_products` ADD CONSTRAINT `damaged_products_variant_id_prices_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `prices`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'damaged_products' AND CONSTRAINT_NAME = 'damaged_products_variant_id_prices_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `damaged_products` ADD CONSTRAINT `damaged_products_batch_id_stock_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `stock_batches`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'damaged_products' AND CONSTRAINT_NAME = 'damaged_products_batch_id_stock_batches_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `order_items` ADD CONSTRAINT `order_items_price_id_prices_id_fk` FOREIGN KEY (`price_id`) REFERENCES `prices`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND CONSTRAINT_NAME = 'order_items_price_id_prices_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `product_adjustments` ADD CONSTRAINT `product_adjustments_variant_id_prices_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `prices`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND CONSTRAINT_NAME = 'product_adjustments_variant_id_prices_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `product_adjustments` ADD CONSTRAINT `product_adjustments_batch_id_stock_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `stock_batches`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND CONSTRAINT_NAME = 'product_adjustments_batch_id_stock_batches_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'ALTER TABLE `product_adjustments` ADD CONSTRAINT `product_adjustments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
	'DO 0')
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND CONSTRAINT_NAME = 'product_adjustments_order_id_orders_id_fk');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'CREATE INDEX `product_adjustments_variant_idx` ON `product_adjustments` (`variant_id`)',
	'DO 0')
	FROM information_schema.STATISTICS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND INDEX_NAME = 'product_adjustments_variant_idx');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(COUNT(*) = 0,
	'CREATE INDEX `product_adjustments_batch_idx` ON `product_adjustments` (`batch_id`)',
	'DO 0')
	FROM information_schema.STATISTICS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_adjustments' AND INDEX_NAME = 'product_adjustments_batch_idx');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Data. Each step only touches rows not yet migrated, so re-running is safe.
-- ---------------------------------------------------------------------------

-- Data: link order items to the variant they sold. Exact match first; then, for
-- rows whose price has since been edited, the variant with the same label.
UPDATE `order_items` oi
	JOIN `prices` p ON p.`product_id` = oi.`product_id` AND p.`amount` = oi.`amount` AND p.`price` = oi.`price`
	SET oi.`price_id` = p.`id`
	WHERE oi.`price_id` IS NULL;

UPDATE `order_items` oi
	SET oi.`price_id` = (SELECT MIN(p.`id`) FROM `prices` p WHERE p.`product_id` = oi.`product_id` AND p.`amount` = oi.`amount`)
	WHERE oi.`price_id` IS NULL;

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
		AND NOT EXISTS (SELECT 1 FROM `stock_batches` b WHERE b.`variant_id` = p.`id` AND b.`batch_number` = 'OPENING');

-- Data: record what each delivered order already took, against the OPENING batch.
INSERT INTO `order_batch_allocations` (`order_id`, `variant_id`, `batch_id`, `quantity`)
	SELECT oi.`order_id`, oi.`price_id`, b.`id`, SUM(oi.`quantity`)
	FROM `order_items` oi
	JOIN `orders` o ON o.`id` = oi.`order_id` AND o.`status` = 'delivered'
	JOIN `stock_batches` b ON b.`variant_id` = oi.`price_id` AND b.`batch_number` = 'OPENING'
	WHERE NOT EXISTS (SELECT 1 FROM `order_batch_allocations` a WHERE a.`order_id` = oi.`order_id`)
	GROUP BY oi.`order_id`, oi.`price_id`, b.`id`;

-- Data: cached totals. A product with no variants keeps its old figure, since
-- there is nowhere to put that stock until it gets one.
UPDATE `prices` p
	SET p.`quantity` = (SELECT COALESCE(SUM(b.`quantity_remaining`), 0) FROM `stock_batches` b WHERE b.`variant_id` = p.`id`);

UPDATE `products` pr
	SET pr.`quantity` = (SELECT COALESCE(SUM(p.`quantity`), 0) FROM `prices` p WHERE p.`product_id` = pr.`id`)
	WHERE EXISTS (SELECT 1 FROM `prices` p WHERE p.`product_id` = pr.`id`);


-- ---------------------------------------------------------------------------
-- Check: every row should say OK.
-- ---------------------------------------------------------------------------
SELECT 'new columns (11)' AS item, IF(COUNT(*) = 11, 'OK', CONCAT(COUNT(*), ' of 11')) AS state
	FROM information_schema.COLUMNS
	WHERE TABLE_SCHEMA = DATABASE() AND (
		(TABLE_NAME = 'prices' AND COLUMN_NAME IN ('sku', 'quantity', 'reorder_level'))
		OR (TABLE_NAME = 'order_items' AND COLUMN_NAME = 'price_id')
		OR (TABLE_NAME = 'damaged_products' AND COLUMN_NAME IN ('variant_id', 'batch_id'))
		OR (TABLE_NAME = 'product_adjustments' AND COLUMN_NAME IN ('variant_id', 'batch_id', 'order_id', 'type', 'balance_after')))
UNION ALL
SELECT 'stock_batches foreign keys (6)', IF(COUNT(*) = 6, 'OK', CONCAT(COUNT(*), ' of 6'))
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_batches' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
UNION ALL
SELECT 'order_batch_allocations foreign keys (3)', IF(COUNT(*) = 3, 'OK', CONCAT(COUNT(*), ' of 3'))
	FROM information_schema.TABLE_CONSTRAINTS
	WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_batch_allocations' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
UNION ALL
SELECT 'variant stock matches batches',
	IF(COUNT(*) = 0, 'OK', CONCAT(COUNT(*), ' variants differ'))
	FROM `prices` p
	WHERE p.`quantity` <> (SELECT COALESCE(SUM(b.`quantity_remaining`), 0) FROM `stock_batches` b WHERE b.`variant_id` = p.`id`)
UNION ALL
SELECT 'order items without a variant (informational)', CAST(COUNT(*) AS CHAR)
	FROM `order_items` WHERE `price_id` IS NULL
UNION ALL
SELECT 'products with stock but no variant (informational)', CAST(COUNT(*) AS CHAR)
	FROM `products` pr
	WHERE pr.`quantity` > 0 AND NOT EXISTS (SELECT 1 FROM `prices` p WHERE p.`product_id` = pr.`id`);
