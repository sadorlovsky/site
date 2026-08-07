CREATE TABLE `AdminCredential` (
	`id` text PRIMARY KEY NOT NULL,
	`publicKey` text NOT NULL,
	`counter` integer NOT NULL,
	`transports` text,
	`createdAt` text NOT NULL,
	`lastUsedAt` text,
	`deviceName` text
);
--> statement-breakpoint
CREATE TABLE `AdminSession` (
	`id` text PRIMARY KEY NOT NULL,
	`credentialId` text NOT NULL,
	`expiresAt` text NOT NULL,
	`createdAt` text NOT NULL,
	`userAgent` text,
	FOREIGN KEY (`credentialId`) REFERENCES `AdminCredential`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `AdminSession_expiresAt_idx` ON `AdminSession` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `AdminSession_credentialId_idx` ON `AdminSession` (`credentialId`);--> statement-breakpoint
CREATE TABLE `ExchangeRate` (
	`id` integer PRIMARY KEY NOT NULL,
	`fromCurrency` text NOT NULL,
	`toCurrency` text NOT NULL,
	`rate` integer NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ItemOption` (
	`id` integer PRIMARY KEY NOT NULL,
	`itemId` integer NOT NULL,
	`label` text,
	`labelRu` text,
	`price` text NOT NULL,
	`url` text,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`itemId`) REFERENCES `WishlistItem`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ItemOption_itemId_idx` ON `ItemOption` (`itemId`);--> statement-breakpoint
CREATE TABLE `Reservation` (
	`id` integer PRIMARY KEY NOT NULL,
	`itemId` integer NOT NULL,
	`reservedBy` text NOT NULL,
	`reservedAt` text NOT NULL,
	`message` text,
	FOREIGN KEY (`itemId`) REFERENCES `WishlistItem`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Reservation_itemId_idx` ON `Reservation` (`itemId`);--> statement-breakpoint
CREATE TABLE `WishlistItem` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`titleRu` text,
	`price` text NOT NULL,
	`imageUrl` text NOT NULL,
	`imageUrlDark` text,
	`description` text,
	`descriptionRu` text,
	`url` text,
	`category` text DEFAULT 'other' NOT NULL,
	`priority` text,
	`received` integer DEFAULT false NOT NULL,
	`createdAt` text NOT NULL,
	`weight` integer DEFAULT 0 NOT NULL
);
