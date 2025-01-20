CREATE TABLE `Character` (
	`hash` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`data` blob NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Conversation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`secret` text DEFAULT (uuid()) NOT NULL,
	`persistenceToken` text,
	`data` blob,
	`characterHash` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`characterHash`) REFERENCES `Character`(`hash`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `Message` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`role` text NOT NULL,
	`senderId` text,
	`conversationId` integer NOT NULL,
	`context` blob DEFAULT '[]' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`senderId`) REFERENCES `Player`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `Player` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`conversationId` integer,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`conversationId`) REFERENCES `Conversation`(`id`) ON UPDATE cascade ON DELETE set null
);
