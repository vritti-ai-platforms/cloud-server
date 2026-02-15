import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { type ChannelType, type Inbox, inboxes } from '@/db/schema';

@Injectable()
export class InboxRepository extends PrimaryBaseRepository<typeof inboxes> {
  constructor(database: PrimaryDatabaseService) {
    super(database, inboxes);
  }

  async findAllByTenantId(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Inbox[]; total: number }> {
    const offset = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        limit,
        offset,
      }),
      this.count(eq(inboxes.tenantId, tenantId)),
    ]);

    return { data, total };
  }

  async findByIdAndTenantId(id: string, tenantId: string): Promise<Inbox | undefined> {
    return this.model.findFirst({
      where: { id, tenantId },
    });
  }

  async findById(id: string): Promise<Inbox | undefined> {
    return this.model.findFirst({
      where: { id },
    });
  }

  async updateChannelConfig(id: string, channelConfig: Record<string, unknown>): Promise<void> {
    await this.update(id, { channelConfig });
  }

  /**
   * Finds an inbox by tenant ID and Instagram user ID stored in channelConfig.
   * Fetches all Instagram inboxes for the tenant and filters in-memory
   * since channelConfig is a JSONB column.
   */
  async findByTenantAndInstagramId(
    tenantId: string,
    instagramUserId: string,
  ): Promise<Inbox | undefined> {
    const tenantInboxes = await this.model.findMany({
      where: {
        tenantId,
        channelType: 'INSTAGRAM' as ChannelType,
      },
    });

    return tenantInboxes.find((inbox) => {
      const config = inbox.channelConfig as Record<string, unknown> | null;
      return config?.instagramUserId === instagramUserId;
    });
  }
}
