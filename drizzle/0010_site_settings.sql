CREATE TABLE IF NOT EXISTS `siteSettings` (
	`id` int NOT NULL,
	`googleAnalyticsMeasurementId` varchar(32),
	`googleTagManagerContainerId` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`)
);
