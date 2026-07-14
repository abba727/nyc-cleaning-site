ALTER TABLE `cmsInvitations` RENAME COLUMN `tokenHash` TO `codeHash`;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` RENAME COLUMN `tokenHash` TO `codeHash`;--> statement-breakpoint
ALTER TABLE `cmsInvitations` DROP INDEX `cmsInvitations_tokenHash_unique`;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` DROP INDEX `passwordResetTokens_tokenHash_unique`;--> statement-breakpoint
ALTER TABLE `cmsInvitations` ADD `attemptCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `cmsInvitations` ADD `resendAvailableAt` timestamp;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` ADD `attemptCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` ADD `resendAvailableAt` timestamp;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` ADD `lastSentAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `passwordResetTokens` ADD `sendCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `cmsInvitations` ADD CONSTRAINT `cmsInvitations_codeHash_unique` UNIQUE(`codeHash`);--> statement-breakpoint
ALTER TABLE `passwordResetTokens` ADD CONSTRAINT `passwordResetTokens_codeHash_unique` UNIQUE(`codeHash`);