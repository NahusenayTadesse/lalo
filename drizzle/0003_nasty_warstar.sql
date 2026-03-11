CREATE TABLE `prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int,
	`price` decimal(10,2) NOT NULL,
	`amount` varchar(255) NOT NULL,
	CONSTRAINT `prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `prices` ADD CONSTRAINT `prices_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `price`;