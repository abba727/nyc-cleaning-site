CREATE TABLE `authAuditEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int,
	`targetUserId` int,
	`targetEmail` varchar(320),
	`action` enum('invited','invitation_resent','invitation_revoked','registered','password_reset_requested','password_reset_completed','role_changed','user_removed','user_restored','login_succeeded','login_failed') NOT NULL,
	`oldRole` enum('admin','content_manager'),
	`newRole` enum('admin','content_manager'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `authAuditEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cmsCredentials` (
	`userId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` text,
	`sessionVersion` int NOT NULL DEFAULT 1,
	`status` enum('pending','active','disabled') NOT NULL DEFAULT 'pending',
	`passwordChangedAt` timestamp,
	`lastSignedInAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cmsCredentials_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `cmsCredentials_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `cmsInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`role` enum('admin','content_manager') NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`status` enum('pending','accepted','revoked','expired') NOT NULL DEFAULT 'pending',
	`invitedByUserId` int NOT NULL,
	`acceptedByUserId` int,
	`expiresAt` timestamp NOT NULL,
	`lastSentAt` timestamp NOT NULL DEFAULT (now()),
	`sendCount` int NOT NULL DEFAULT 1,
	`acceptedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cmsInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `cmsInvitations_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE TABLE `passwordResetTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `passwordResetTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `passwordResetTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','content_manager') NOT NULL DEFAULT 'content_manager';--> statement-breakpoint
ALTER TABLE `users` ADD `isPrimaryAdmin` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `roleChangedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `roleChangedByUserId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `deletedAt` timestamp;