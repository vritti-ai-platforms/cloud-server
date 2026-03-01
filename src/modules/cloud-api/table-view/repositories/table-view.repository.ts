import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq, or } from '@vritti/api-sdk/drizzle-orm';
import { type TableView, tableViews } from '@/db/schema';

@Injectable()
export class TableViewRepository extends PrimaryBaseRepository<typeof tableViews> {
  constructor(database: PrimaryDatabaseService) {
    super(database, tableViews);
  }

  // Finds the auto-saved live state row for a user+table pair
  async findCurrentByUserAndSlug(userId: string, tableSlug: string): Promise<TableView | undefined> {
    return this.model.findFirst({
      where: { userId, tableSlug, isCurrent: true },
    });
  }

  // Upserts the live state row — updates if exists, inserts if not
  async upsertCurrent(data: { userId: string; tableSlug: string; state: unknown }): Promise<TableView> {
    const existing = await this.findCurrentByUserAndSlug(data.userId, data.tableSlug);
    if (existing) {
      return this.update(existing.id, { state: data.state });
    }
    return this.create({
      userId: data.userId,
      tableSlug: data.tableSlug,
      name: null,
      state: data.state,
      isCurrent: true,
      isShared: false,
    });
  }

  // Returns all named views for a table — own rows and all shared rows from other users, capped at 100
  async findNamedViewsBySlug(userId: string, tableSlug: string): Promise<TableView[]> {
    const results = await this.db
      .select()
      .from(tableViews)
      .where(
        and(
          eq(tableViews.tableSlug, tableSlug),
          eq(tableViews.isCurrent, false),
          or(eq(tableViews.userId, userId), eq(tableViews.isShared, true)),
        ),
      )
      .orderBy(tableViews.createdAt)
      .limit(100);
    return results;
  }
}
