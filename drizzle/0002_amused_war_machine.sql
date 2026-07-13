CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(512) NOT NULL,
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`blocks` json NOT NULL,
	`coverImageUrl` text NOT NULL,
	`coverImageAlt` varchar(512) NOT NULL,
	`sourceUrl` text,
	`status` enum('draft','published') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdByOpenId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`),
	CONSTRAINT `articles_path_unique` UNIQUE(`path`)
);
