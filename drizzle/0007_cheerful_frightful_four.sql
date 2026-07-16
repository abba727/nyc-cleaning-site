CREATE TABLE `inquiryResponses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`inquiryId` int NOT NULL,
	`senderUserId` int NOT NULL,
	`senderName` varchar(200) NOT NULL,
	`senderEmail` varchar(320) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`subject` varchar(320) NOT NULL,
	`message` text NOT NULL,
	`providerMessageId` varchar(255),
	`deliveryStatus` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`errorMessage` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inquiryResponses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `lastRespondedAt` timestamp;