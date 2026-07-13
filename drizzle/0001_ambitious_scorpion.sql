CREATE TABLE `inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryType` enum('contact','quote') NOT NULL DEFAULT 'quote',
	`name` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(48) NOT NULL,
	`serviceType` varchar(160) NOT NULL,
	`message` text NOT NULL,
	`sourcePath` varchar(512) NOT NULL,
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`notificationStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inquiries_id` PRIMARY KEY(`id`)
);
