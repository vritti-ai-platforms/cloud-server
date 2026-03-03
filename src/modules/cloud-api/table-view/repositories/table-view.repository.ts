import { Injectable } from '@nestjs/common';

import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { type TableView, tableViews } from '@/db/schema';

const NAMED_VIEWS_LIMIT = 100;

@Injectable()
export class TableViewRepository extends PrimaryBaseRepository<typeof tableViews> {
  constructor(database: PrimaryDatabaseService) {
    super(database, tableViews);
  }

  // Returns personal (non-shared) named views owned by the user for a given table
  async findPersonalViewsBySlug(userId: string, tableSlug: string): Promise<TableView[]> {
    return this.db
      .select()
      .from(tableViews)
      .where(and(eq(tableViews.tableSlug, tableSlug), eq(tableViews.userId, userId), eq(tableViews.isShared, false)))
      .orderBy(tableViews.createdAt)
      .limit(NAMED_VIEWS_LIMIT);
  }

  // Returns all shared named views for a given table — visible to all users
  async findSharedViewsBySlug(tableSlug: string): Promise<TableView[]> {
    return this.db
      .select()
      .from(tableViews)
      .where(and(eq(tableViews.tableSlug, tableSlug), eq(tableViews.isShared, true)))
      .orderBy(tableViews.createdAt)
      .limit(NAMED_VIEWS_LIMIT);
  }
}
