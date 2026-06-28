CREATE TABLE `place_names` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`fee` decimal(10,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `place_names_id` PRIMARY KEY(`id`),
	CONSTRAINT `place_names_name_unique` UNIQUE(`name`)
);

ALTER TABLE `orders` ADD `address` varchar(255) NOT NULL;
ALTER TABLE `orders` ADD `fee` decimal(10,2) NOT NULL;
ALTER TABLE `place_names` ADD CONSTRAINT `place_names_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `place_names` ADD CONSTRAINT `place_names_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `place_names` ADD CONSTRAINT `place_names_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
