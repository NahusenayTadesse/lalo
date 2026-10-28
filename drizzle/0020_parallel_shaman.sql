ALTER TABLE `transactions` MODIFY COLUMN `payment_status` enum('pending','paid','unpaid','refunded','partially_paid','partially_refunded','overpaid','disputed') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `orders` ADD `delivered_at` datetime;--> statement-breakpoint
CREATE INDEX `transactions_reciept_link_idx` ON `transactions` (`reciept_link`);--> statement-breakpoint
-- Backfill (hand-written): orders delivered before `delivered_at` existed. `updated_at` is the closest record of when that happened.
UPDATE `orders` SET `delivered_at` = `updated_at` WHERE `status` = 'delivered' AND `delivered_at` IS NULL;--> statement-breakpoint
-- Backfill (hand-written): nothing ever set `payment_status`, so every delivered order's payment still reads 'pending'.
UPDATE `transactions` t INNER JOIN `orders` o ON o.`transaction_id` = t.`id` SET t.`payment_status` = 'paid' WHERE o.`status` = 'delivered' AND t.`payment_method_id` IS NOT NULL AND t.`payment_status` = 'pending';
