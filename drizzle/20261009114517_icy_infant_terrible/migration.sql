CREATE TABLE `activity` (
	`id` text PRIMARY KEY,
	`board_id` text NOT NULL,
	`card_id` text,
	`user_id` text,
	`message` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_activity_board_id_board_id_fk` FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_activity_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_activity_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `board` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`color` text DEFAULT 'coral' NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_board_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `board_list` (
	`id` text PRIMARY KEY,
	`board_id` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `fk_board_list_board_id_board_id_fk` FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `card` (
	`id` text PRIMARY KEY,
	`board_id` text NOT NULL,
	`list_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	`labels` text DEFAULT '[]' NOT NULL,
	`assignees` text DEFAULT '[]' NOT NULL,
	`due_date` text,
	`checklist` text DEFAULT '[]' NOT NULL,
	`cover` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_card_board_id_board_id_fk` FOREIGN KEY (`board_id`) REFERENCES `board`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_card_list_id_board_list_id_fk` FOREIGN KEY (`list_id`) REFERENCES `board_list`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `comment` (
	`id` text PRIMARY KEY,
	`card_id` text NOT NULL,
	`user_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_comment_card_id_card_id_fk` FOREIGN KEY (`card_id`) REFERENCES `card`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_comment_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY,
	`workspace_id` text NOT NULL,
	`email` text NOT NULL,
	`token_hash` text NOT NULL UNIQUE,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	CONSTRAINT `fk_invitation_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `membership` (
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	CONSTRAINT `membership_pk` PRIMARY KEY(`workspace_id`, `user_id`),
	CONSTRAINT `fk_membership_workspace_id_workspace_id_fk` FOREIGN KEY (`workspace_id`) REFERENCES `workspace`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_membership_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `workspace` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_board_idx` ON `activity` (`board_id`);--> statement-breakpoint
CREATE INDEX `board_workspace_idx` ON `board` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `list_board_idx` ON `board_list` (`board_id`);--> statement-breakpoint
CREATE INDEX `card_board_idx` ON `card` (`board_id`);--> statement-breakpoint
CREATE INDEX `card_list_idx` ON `card` (`list_id`);--> statement-breakpoint
CREATE INDEX `comment_card_idx` ON `comment` (`card_id`);--> statement-breakpoint
CREATE INDEX `membership_user_idx` ON `membership` (`user_id`);