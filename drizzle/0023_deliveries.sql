CREATE TABLE `deliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`status` enum('ready','dispatched','delivered','failed','cancelled') NOT NULL DEFAULT 'ready',
	`method` enum('delivery','pickup') NOT NULL DEFAULT 'delivery',
	`area` varchar(255),
	`address` varchar(255),
	`recipient_name` varchar(100),
	`recipient_phone` varchar(20),
	`driver_id` int,
	`driver_name` varchar(100),
	`driver_phone` varchar(20),
	`vehicle_plate` varchar(20),
	`vehicle_type` varchar(50),
	`scheduled_for` datetime,
	`dispatched_at` datetime,
	`dispatched_by` varchar(255),
	`delivered_at` datetime,
	`confirmed_by` varchar(255),
	`confirmed_via` enum('staff','customer'),
	`received_by` varchar(100),
	`proof_link` varchar(255),
	`cash_to_collect` decimal(10,2),
	`attempts` int NOT NULL DEFAULT 0,
	`failure_reason` varchar(255),
	`notes` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `deliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `deliveries_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`vehicle_plate` varchar(20),
	`vehicle_type` varchar(50),
	`notes` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `delivery_drivers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`delivery_id` int NOT NULL,
	`event` varchar(32) NOT NULL,
	`note` varchar(255),
	`user_id` varchar(255),
	`by_customer` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `delivery_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_driver_id_delivery_drivers_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `delivery_drivers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_dispatched_by_user_id_fk` FOREIGN KEY (`dispatched_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_confirmed_by_user_id_fk` FOREIGN KEY (`confirmed_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deliveries` ADD CONSTRAINT `deliveries_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_drivers` ADD CONSTRAINT `delivery_drivers_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_drivers` ADD CONSTRAINT `delivery_drivers_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_drivers` ADD CONSTRAINT `delivery_drivers_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_events` ADD CONSTRAINT `delivery_events_delivery_id_deliveries_id_fk` FOREIGN KEY (`delivery_id`) REFERENCES `deliveries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_events` ADD CONSTRAINT `delivery_events_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `deliveries_status_idx` ON `deliveries` (`status`);--> statement-breakpoint
CREATE INDEX `deliveries_driver_idx` ON `deliveries` (`driver_id`);--> statement-breakpoint
CREATE INDEX `deliveries_dispatched_at_idx` ON `deliveries` (`dispatched_at`);--> statement-breakpoint
CREATE INDEX `delivery_events_delivery_idx` ON `delivery_events` (`delivery_id`);--> statement-breakpoint
-- Backfill: every order delivered before the tracker gets a delivery record, so
-- its history and batches show on the deliveries page. Who drove it is unknown.
INSERT INTO `deliveries` (`order_id`, `status`, `method`, `area`, `address`, `recipient_name`, `recipient_phone`, `delivered_at`, `confirmed_via`, `created_at`)
SELECT o.`id`, 'delivered', IF(o.`address` = 'Store Pickup', 'pickup', 'delivery'), o.`address`, o.`delivery_address`, c.`name`, c.`phone`, COALESCE(o.`delivered_at`, o.`updated_at`), 'staff', o.`created_at`
FROM `orders` o LEFT JOIN `customers` c ON c.`id` = o.`customer_id`
WHERE o.`status` = 'delivered' AND NOT EXISTS (SELECT 1 FROM `deliveries` d WHERE d.`order_id` = o.`id`);--> statement-breakpoint
-- Pending orders that are already paid are waiting to go out.
INSERT INTO `deliveries` (`order_id`, `status`, `method`, `area`, `address`, `recipient_name`, `recipient_phone`, `created_at`)
SELECT o.`id`, 'ready', IF(o.`address` = 'Store Pickup', 'pickup', 'delivery'), o.`address`, o.`delivery_address`, c.`name`, c.`phone`, NOW()
FROM `orders` o
JOIN `transactions` t ON t.`id` = o.`transaction_id`
LEFT JOIN `customers` c ON c.`id` = o.`customer_id`
WHERE o.`status` = 'pending' AND t.`payment_status` = 'paid' AND NOT EXISTS (SELECT 1 FROM `deliveries` d WHERE d.`order_id` = o.`id`);
