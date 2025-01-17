import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const conversation = sqliteTable("Conversation", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    secret: text("secret")
        .notNull()
        .default(sql`(uuid())`),
    persistenceToken: text("persistenceToken"),
    data: blob("data", { mode: "json" }),
    characterHash: text("characterHash")
        .notNull()
        .references(() => character.hash, {
            onDelete: "set null",
            onUpdate: "cascade",
        }),
    createdAt: text("createdAt")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
});

export const player = sqliteTable("Player", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    name: text("name").notNull(),
    conversationId: integer("conversationId").references(
        () => conversation.id,
        { onDelete: "set null", onUpdate: "cascade" },
    ),
    createdAt: text("createdAt")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
});

export const character = sqliteTable("Character", {
    hash: text("hash").primaryKey().notNull(),
    name: text("name").notNull(),
    data: blob("data", { mode: "json" }).notNull(),
    createdAt: text("createdAt")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
});

export const message = sqliteTable("Message", {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    content: text("content").notNull(),
    role: text("role").notNull(),
    senderId: integer("senderId").references(() => player.id, {
        onDelete: "set null",
        onUpdate: "cascade",
    }),
    conversationId: integer("conversationId")
        .notNull()
        .references(() => conversation.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
    context: blob("context", { mode: "json" })
        .$type<{ key: string; value: string }[]>()
        .notNull()
        .default([]),
    createdAt: text("createdAt")
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updatedAt").notNull(),
});
