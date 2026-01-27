import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, sql } from '@vritti/api-sdk/drizzle-orm';
import {
  type ChatConversation,
  type ChatMessage,
  type NewChatConversation,
  type NewChatMessage,
  chatConversations,
  chatMessages,
} from '@/db/schema';

@Injectable()
export class ChatRepository extends PrimaryBaseRepository<typeof chatConversations> {
  constructor(database: PrimaryDatabaseService) {
    super(database, chatConversations);
  }

  // --- Conversation Methods ---

  async findConversationsByUserId(userId: string): Promise<ChatConversation[]> {
    this.logger.debug(`Finding conversations for user: ${userId}`);
    return this.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findConversationByIdAndUserId(
    conversationId: string,
    userId: string,
  ): Promise<ChatConversation | undefined> {
    this.logger.debug(`Finding conversation ${conversationId} for user ${userId}`);
    return this.model.findFirst({
      where: and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId),
      ),
    });
  }

  async findConversationWithMessages(
    conversationId: string,
    userId: string,
  ): Promise<(ChatConversation & { messages: ChatMessage[] }) | undefined> {
    this.logger.debug(`Finding conversation ${conversationId} with messages`);
    const result = await this.model.findFirst({
      where: and(
        eq(chatConversations.id, conversationId),
        eq(chatConversations.userId, userId),
      ),
      with: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    return result as (ChatConversation & { messages: ChatMessage[] }) | undefined;
  }

  async createConversation(data: NewChatConversation): Promise<ChatConversation> {
    this.logger.log(`Creating conversation for user: ${data.userId}`);
    return this.create(data);
  }

  async updateConversationTitle(conversationId: string, title: string): Promise<ChatConversation> {
    this.logger.log(`Updating conversation ${conversationId} title`);
    return this.update(conversationId, { title });
  }

  async deleteConversation(conversationId: string): Promise<ChatConversation> {
    this.logger.log(`Deleting conversation: ${conversationId}`);
    return this.delete(conversationId);
  }

  // --- Message Methods ---

  async getMessagesByConversationId(conversationId: string): Promise<ChatMessage[]> {
    this.logger.debug(`Getting messages for conversation: ${conversationId}`);
    return this.db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }

  async createMessage(data: NewChatMessage): Promise<ChatMessage> {
    this.logger.debug(`Creating message in conversation: ${data.conversationId}`);
    const [message] = await this.db.insert(chatMessages).values(data).returning();

    // Increment message count atomically
    await this.db
      .update(chatConversations)
      .set({
        messageCount: sql`${chatConversations.messageCount} + 1`,
      })
      .where(eq(chatConversations.id, data.conversationId));

    return message;
  }

  async createMessages(messages: NewChatMessage[]): Promise<ChatMessage[]> {
    if (messages.length === 0) return [];

    this.logger.debug(`Creating ${messages.length} messages`);
    const created = await this.db.insert(chatMessages).values(messages).returning();

    // Increment message count atomically
    const conversationId = messages[0].conversationId;
    await this.db
      .update(chatConversations)
      .set({
        messageCount: sql`${chatConversations.messageCount} + ${messages.length}`,
      })
      .where(eq(chatConversations.id, conversationId));

    return created;
  }
}
