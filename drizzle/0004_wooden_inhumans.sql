ALTER TABLE `articles` ADD `slug` varchar(512);--> statement-breakpoint
ALTER TABLE `articles` ADD `excerpt` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `body` json;--> statement-breakpoint
ALTER TABLE `articles` ADD `seoTitle` varchar(512);--> statement-breakpoint
ALTER TABLE `articles` ADD `metaDescription` text;--> statement-breakpoint
ALTER TABLE `articles` ADD `authorName` varchar(255);