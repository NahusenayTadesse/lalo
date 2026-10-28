ALTER TABLE `discounts` ADD `name_am` varchar(255);--> statement-breakpoint
ALTER TABLE `discounts` ADD `description_am` text;--> statement-breakpoint
ALTER TABLE `place_names` ADD `name_am` varchar(100);--> statement-breakpoint
ALTER TABLE `product_categories` ADD `name_am` varchar(255);--> statement-breakpoint
ALTER TABLE `product_categories` ADD `description_am` text;--> statement-breakpoint
ALTER TABLE `products` ADD `name_am` varchar(255);--> statement-breakpoint
ALTER TABLE `products` ADD `description_am` text;--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD `name_am` varchar(255);--> statement-breakpoint
ALTER TABLE `recipe_ingredients` ADD `amount_am` varchar(100);--> statement-breakpoint
ALTER TABLE `recipes` ADD `title_am` varchar(255);--> statement-breakpoint
ALTER TABLE `recipes` ADD `description_am` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `instructions_am` text;--> statement-breakpoint
ALTER TABLE `testimonials` ADD `position_am` varchar(255);--> statement-breakpoint
ALTER TABLE `testimonials` ADD `message_am` text;