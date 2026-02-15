import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { type Message, type MessageStatus, messages } from '@/db/schema';

@Injectable()
export class MessageRepository extends PrimaryBaseRepository<typeof messages> {
  constructor(database: PrimaryDatabaseService) {
    super(database, messages);
  }

  async findByConversationId(
    conversationId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Message[]; total: number }> {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        limit,
        offset,
      }),
      this.count(eq(messages.conversationId, conversationId)),
    ]);

    return { data, total };
  }

  async updateStatus(
    messageId: string,
    status: MessageStatus,
    contentAttributes?: Record<string, unknown>,
  ): Promise<void> {
    const updates: Record<string, unknown> = { status };
    if (contentAttributes) {
      updates.contentAttributes = contentAttributes;
    }
    await this.update(messageId, updates);
  }
}
