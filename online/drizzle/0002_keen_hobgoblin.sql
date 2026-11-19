CREATE TABLE `workplace_print_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`receipt` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`claimed_at` integer,
	`claim_token` text
);
--> statement-breakpoint
CREATE INDEX `workplace_print_queue` ON `workplace_print_jobs` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `workplace_print_order` ON `workplace_print_jobs` (`order_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `workplace_print_one_active` ON `workplace_print_jobs` (`order_id`) WHERE "workplace_print_jobs"."status" in ('queued', 'printing');