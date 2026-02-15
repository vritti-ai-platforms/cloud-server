import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, desc, eq, like, sql } from '@vritti/api-sdk/drizzle-orm';
import {
  type Conversation,
  type ConversationStatus,
  type ChannelType,
  conversations,
  inboxes,
} from '@/db/schema';

export interface ConversationFilters {
  status?: ConversationStatus;
  search?: string;
  channelType?: ChannelType;
  inboxId?: string;
  page: number;
  limit: number;
}

export interface ConversationStatusCounts {
  all: number;
  open: number;
  resolved: number;
  pending: number;
  snoozed: number;
}

@Injectable()
export class ConversationRepository extends PrimaryBaseRepository<typeof conversations> {
  constructor(database: PrimaryDatabaseService) {
    super(database, conversations);
  }

  async findAllFiltered(
    tenantId: string,
    filters: ConversationFilters,
  ): Promise<{ data: Conversation[]; total: number }> {
    const { status, search, channelType, inboxId, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [eq(conversations.tenantId, tenantId)];

    if (status) {
      conditions.push(eq(conversations.status, status));
    }

    if (inboxId) {
      conditions.push(eq(conversations.inboxId, inboxId));
    }

    if (search) {
      conditions.push(like(conversations.lastMessageContent, `%${search}%`));
    }

    if (channelType) {
      const inboxSubquery = this.db
        .select({ id: inboxes.id })
        .from(inboxes)
        .where(and(eq(inboxes.tenantId, tenantId), eq(inboxes.channelType, channelType)));

      conditions.push(sql`${conversations.inboxId} IN (${inboxSubquery})`);
    }

    const whereClause = and(...conditions)!;

    // Step 1: Get matching IDs and total count in parallel using the builder API.
    // The builder API references the table directly (no aliasing), so complex SQL
    // expressions (LIKE, IN subquery) resolve correctly.
    const [matchedIds, total] = await Promise.all([
      this.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(whereClause)
        .orderBy(desc(conversations.updatedAt))
        .limit(limit)
        .offset(offset),
      this.count(whereClause),
    ]);

    if (matchedIds.length === 0) {
      return { data: [], total };
    }

    const idList = matchedIds.map((row) => row.id);

    // Step 2: Load full records with relations using the relational API.
    // Use a callback-based where so Drizzle provides the properly aliased table reference.
    const data = await this.model.findMany({
      where: (table, { inArray: inArrayOp }) => inArrayOp(table.id, idList),
      with: { contact: true, inbox: true },
    });

    // Step 3: Re-sort to match the original order from step 1.
    const idOrder = new Map(idList.map((id, index) => [id, index]));
    data.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

    return { data, total };
  }

  async findByIdAndTenantId(id: string, tenantId: string) {
    return this.model.findFirst({
      where: { id, tenantId },
      with: { contact: true, inbox: true, contactInbox: true },
    });
  }

  async countByStatus(tenantId: string): Promise<ConversationStatusCounts> {
    const tenantCondition = eq(conversations.tenantId, tenantId);

    const [all, open, resolved, pending, snoozed] = await Promise.all([
      this.count(tenantCondition),
      this.count(and(tenantCondition, eq(conversations.status, 'OPEN'))),
      this.count(and(tenantCondition, eq(conversations.status, 'RESOLVED'))),
      this.count(and(tenantCondition, eq(conversations.status, 'PENDING'))),
      this.count(and(tenantCondition, eq(conversations.status, 'SNOOZED'))),
    ]);

    return { all, open, resolved, pending, snoozed };
  }

  async findByContactInboxId(
    contactInboxId: string,
    status?: ConversationStatus,
  ): Promise<Conversation | undefined> {
    const where: Record<string, unknown> = { contactInboxId };
    if (status) {
      where.status = status;
    }
    return this.model.findFirst({ where });
  }

  async findByContactId(contactId: string, excludeId?: string): Promise<Conversation[]> {
    if (excludeId) {
      return this.model.findMany({
        where: {
          RAW: () => and(eq(conversations.contactId, contactId), sql`${conversations.id} != ${excludeId}`),
        },
      });
    }

    return this.model.findMany({
      where: { contactId },
    });
  }

  async findByContactIdWithRelations(contactId: string, excludeId?: string) {
    if (excludeId) {
      return this.model.findMany({
        where: {
          RAW: () => and(eq(conversations.contactId, contactId), sql`${conversations.id} != ${excludeId}`),
        },
        with: { contact: true, inbox: true },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return this.model.findMany({
      where: { contactId },
      with: { contact: true, inbox: true },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
