CREATE TABLE `assistant_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `assistant_messages_user_time_idx` ON `assistant_messages` (`user_email`,`created_at`);