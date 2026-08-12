DROP INDEX "AdminSession_expiresAt_idx";--> statement-breakpoint
DROP INDEX "AdminSession_credentialId_idx";--> statement-breakpoint
DROP INDEX "ItemOption_itemId_idx";--> statement-breakpoint
DROP INDEX "Reservation_itemId_idx";--> statement-breakpoint
ALTER TABLE `ExchangeRate` ALTER COLUMN "rate" TO "rate" real NOT NULL;--> statement-breakpoint
CREATE INDEX `AdminSession_expiresAt_idx` ON `AdminSession` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `AdminSession_credentialId_idx` ON `AdminSession` (`credentialId`);--> statement-breakpoint
CREATE INDEX `ItemOption_itemId_idx` ON `ItemOption` (`itemId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Reservation_itemId_idx` ON `Reservation` (`itemId`);