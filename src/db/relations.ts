import { relations } from "drizzle-orm/relations";
import { character, conversation, player, message } from "./schema";

export const conversationRelations = relations(
    conversation,
    ({ one, many }) => ({
        character: one(character, {
            fields: [conversation.characterHash],
            references: [character.hash],
        }),
        players: many(player),
        messages: many(message),
    }),
);

export const characterRelations = relations(character, ({ many }) => ({
    conversations: many(conversation),
}));

export const playerRelations = relations(player, ({ one, many }) => ({
    conversation: one(conversation, {
        fields: [player.conversationId],
        references: [conversation.id],
    }),
    messages: many(message),
}));

export const messageRelations = relations(message, ({ one, many }) => ({
    player: one(player, {
        fields: [message.senderId],
        references: [player.id],
    }),
    conversation: one(conversation, {
        fields: [message.conversationId],
        references: [conversation.id],
    }),
}));
