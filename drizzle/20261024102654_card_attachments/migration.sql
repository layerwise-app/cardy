CREATE TABLE `attachment` (
	`id` text PRIMARY KEY,
	`card_id` text NOT NULL,
	`board_id` text NOT NULL,
	`user_id` text,
	`key` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`content_type` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_attachment_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_attachment_board_id_board_id_fk` FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_attachment_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `attachment_card_idx` ON `attachment` (`card_id`);