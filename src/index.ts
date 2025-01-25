import { Adapter, Character, User } from "@stealthstudios/sdk-core";
import db from "./db";
import { character, conversation, message, player } from "db/schema";
import { desc, eq, or } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";

interface SQLiteAdapterOptions {
    connectionString: string;
    authToken?: string;
}

export default class SQLiteAdapter extends Adapter {
    db: ReturnType<typeof db>;

    constructor(options: SQLiteAdapterOptions) {
        super(options);
        this.db = db(options.connectionString, options.authToken);
    }

    async init(): Promise<void> {
        try {
            await migrate(this.db, {
                migrationsFolder: path.join(
                    import.meta.dirname,
                    "..",
                    "drizzle",
                ),
            });
        } catch (error) {
            throw new Error(`Failed to initialize database: ${error}`);
        }
    }

    async getCharacter(hash: string) {
        try {
            const [data] = await this.db
                .select()
                .from(character)
                .where(eq(character.hash, hash))
                .limit(1);

            if (!data) return undefined;

            return {
                name: data.name,
                hash: data.hash,
                data: JSON.parse(data.data as string),
            };
        } catch (error) {
            throw new Error(`Failed to get character: ${error}`);
        }
    }

    async createCharacter(characterData: Character) {
        try {
            // First check if character exists
            const existing = await this.getCharacter(characterData.hash);
            if (existing) return existing;

            const personality = Object.fromEntries(
                Object.entries(characterData).filter(([key]) => key !== "hash"),
            );

            const [result] = await this.db
                .insert(character)
                .values({
                    hash: characterData.hash,
                    name: characterData.name,
                    data: JSON.stringify(personality),
                    updatedAt: new Date().toISOString(),
                })
                .returning();

            if (!result) return undefined;

            return {
                hash: characterData.hash,
                name: characterData.name,
                data: JSON.parse(result.data as string),
            };
        } catch (error) {
            throw new Error(`Failed to create character: ${error}`);
        }
    }

    async createConversation({
        character: char,
        users,
        persistenceToken,
    }: {
        character: Character;
        users: User[];
        persistenceToken?: string;
    }) {
        try {
            // Ensure character exists first
            const characterExists = await this.getCharacter(char.hash);
            if (!characterExists) {
                throw new Error(
                    "Character must exist before creating conversation",
                );
            }

            return await this.db.transaction(async (tx) => {
                const [conversationResult] = await tx
                    .insert(conversation)
                    .values({
                        persistenceToken,
                        characterHash: char.hash,
                        updatedAt: new Date().toISOString(),
                    })
                    .returning();

                if (!conversationResult) {
                    throw new Error("Failed to create conversation");
                }

                await Promise.all(
                    users.map(async (user) => {
                        const existingPlayer = await tx
                            .select()
                            .from(player)
                            .where(eq(player.id, user.id))
                            .limit(1);

                        if (existingPlayer.length > 0) {
                            await tx
                                .update(player)
                                .set({
                                    conversationId: conversationResult.id,
                                    name: user.name,
                                    updatedAt: new Date().toISOString(),
                                })
                                .where(eq(player.id, user.id));
                        } else {
                            await tx.insert(player).values({
                                id: user.id,
                                name: user.name,
                                conversationId: conversationResult.id,
                                updatedAt: new Date().toISOString(),
                            });
                        }
                    }),
                );

                return {
                    id: conversationResult.id,
                    secret: conversationResult.secret,
                };
            });
        } catch (error) {
            throw new Error(`Failed to create conversation: ${error}`);
        }
    }

    async getConversationBy({
        id,
        secret,
        persistenceToken,
    }: {
        id?: number;
        secret?: string;
        persistenceToken?: string;
    }) {
        if (!id && !secret && !persistenceToken) {
            throw new Error("No parameters provided to filter by");
        }

        const filters = [];

        if (id) {
            filters.push(eq(conversation.id, id));
        }

        if (secret) {
            filters.push(eq(conversation.secret, secret));
        }

        if (persistenceToken) {
            filters.push(eq(conversation.persistenceToken, persistenceToken));
        }

        const [result] = await this.db
            .select({
                conversation: conversation,
                character: character,
            })
            .from(conversation)
            .leftJoin(character, eq(character.hash, conversation.characterHash))
            .where(or(...filters))
            .limit(1);

        if (!result) {
            return null;
        }

        const conversationData = result.conversation;

        const users = await this.db
            .select()
            .from(player)
            .where(eq(player.conversationId, conversationData.id));

        const data = {
            ...conversationData,
            users,
            character: result.character,
        };

        return data;
    }

    async setConversationData(conversationId: number, data: any) {
        // get current data
        const currentData = await this.getConversationBy({
            id: conversationId,
        });

        if (!currentData) {
            throw new Error("Conversation not found");
        }

        await this.db
            .update(conversation)
            .set({ data: { ...(currentData.data ?? {}), ...data } })
            .where(eq(conversation.id, conversationId));
    }

    async getConversationMessages(conversationId: number) {
        const messages = await this.db
            .select()
            .from(message)
            .where(eq(message.conversationId, conversationId))
            .orderBy(desc(message.createdAt));

        return messages.map((msg) => ({
            ...msg,
            senderId: msg.senderId ?? undefined,
        }));
    }

    async setConversationUsers(conversationId: number, users: User[]) {
        for (const user of users) {
            const [existingPlayer] = await this.db
                .select()
                .from(player)
                .where(eq(player.id, user.id))
                .limit(1);

            if (existingPlayer) {
                await this.db
                    .update(player)
                    .set({ conversationId, name: user.name })
                    .where(eq(player.id, user.id));
            } else {
                await this.db.insert(player).values({
                    id: user.id,
                    name: user.name,
                    conversationId,
                    updatedAt: new Date().toISOString(),
                });
            }
        }
    }

    async setConversationCharacter(
        conversationId: number,
        character: Character,
    ) {
        const currentCharacter = await this.getConversationBy({
            id: conversationId,
        });

        if (currentCharacter?.character?.hash === character.hash) {
            return;
        }

        await this.db
            .delete(message)
            .where(eq(message.conversationId, conversationId));

        await this.db
            .update(conversation)
            .set({ characterHash: character.hash })
            .where(eq(conversation.id, conversationId));
    }

    async addMessageToConversation(
        conversationId: number,
        insertedMessage: {
            senderId?: string;
            content: string;
            role: string;
            context: {
                key: string;
                value: string;
            }[];
        },
    ) {
        await this.db.insert(message).values({
            conversationId,
            senderId: insertedMessage.senderId,
            content: insertedMessage.content,
            role: insertedMessage.role,
            context: insertedMessage.context,
            updatedAt: new Date().toISOString(),
        });
    }

    async finishConversation(conversationId: number) {
        await this.db
            .delete(conversation)
            .where(eq(conversation.id, conversationId));
    }
}
