ALTER TABLE `card` ADD `priority` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
-- The "High priority" label is replaced by the priority field.
UPDATE `card` SET `priority` = 'high', `labels` = (SELECT json_group_array(`value`) FROM json_each(`card`.`labels`) WHERE `value` <> 'High priority') WHERE EXISTS (SELECT 1 FROM json_each(`card`.`labels`) WHERE `value` = 'High priority');--> statement-breakpoint
-- Remove the read-only sample board so the server reseeds it from the current fixture.
DELETE FROM `activity` WHERE `board_id` = 'cardy-welcome';--> statement-breakpoint
DELETE FROM `comment` WHERE `card_id` IN (SELECT `id` FROM `card` WHERE `board_id` = 'cardy-welcome');--> statement-breakpoint
DELETE FROM `card` WHERE `board_id` = 'cardy-welcome';--> statement-breakpoint
DELETE FROM `board_list` WHERE `board_id` = 'cardy-welcome';--> statement-breakpoint
DELETE FROM `board` WHERE `id` = 'cardy-welcome';--> statement-breakpoint
DELETE FROM `invitation` WHERE `workspace_id` = 'cardy-welcome';--> statement-breakpoint
DELETE FROM `membership` WHERE `workspace_id` = 'cardy-welcome';--> statement-breakpoint
DELETE FROM `workspace` WHERE `id` = 'cardy-welcome';
