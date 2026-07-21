CREATE TABLE `projectImports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filename` varchar(255) NOT NULL,
	`sourceType` enum('csv','xlsx','xls') NOT NULL,
	`rowCount` int NOT NULL DEFAULT 0,
	`importedCount` int NOT NULL DEFAULT 0,
	`skippedCount` int NOT NULL DEFAULT 0,
	`status` enum('completed','partial','failed') NOT NULL DEFAULT 'completed',
	`errorSummary` text,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectImports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projectLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`address` varchar(512) NOT NULL,
	`city` varchar(160) NOT NULL,
	`state` varchar(64) NOT NULL,
	`zip` varchar(24) NOT NULL,
	`label` varchar(255),
	`latitude` double,
	`longitude` double,
	`isActive` boolean NOT NULL DEFAULT true,
	`importBatchId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projectLocations_id` PRIMARY KEY(`id`)
);
