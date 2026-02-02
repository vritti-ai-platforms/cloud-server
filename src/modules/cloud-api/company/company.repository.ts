import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, sql } from '@vritti/api-sdk/drizzle-orm';
import { companies } from '@/db/schema';

type Company = typeof companies.$inferSelect;

@Injectable()
export class CompanyRepository extends PrimaryBaseRepository<typeof companies> {
  constructor(database: PrimaryDatabaseService) {
    super(database, companies);
  }

  async findByTenantId(tenantId: string): Promise<Company | undefined> {
    // Use Drizzle v2 object-based filter syntax for relational queries
    return this.model.findFirst({
      where: { tenantId },
    });
  }

  async incrementUsersCount(id: string): Promise<void> {
    await this.db
      .update(companies)
      .set({ usersCount: sql`${companies.usersCount} + 1` })
      .where(eq(companies.id, id));
  }

  async decrementUsersCount(id: string): Promise<void> {
    await this.db
      .update(companies)
      .set({ usersCount: sql`GREATEST(${companies.usersCount} - 1, 0)` })
      .where(eq(companies.id, id));
  }

  async incrementBusinessUnitsCount(id: string): Promise<void> {
    await this.db
      .update(companies)
      .set({ businessUnitsCount: sql`${companies.businessUnitsCount} + 1` })
      .where(eq(companies.id, id));
  }

  async decrementBusinessUnitsCount(id: string): Promise<void> {
    await this.db
      .update(companies)
      .set({ businessUnitsCount: sql`GREATEST(${companies.businessUnitsCount} - 1, 0)` })
      .where(eq(companies.id, id));
  }

  async incrementEnabledAppsCount(id: string): Promise<void> {
    await this.db
      .update(companies)
      .set({ enabledAppsCount: sql`${companies.enabledAppsCount} + 1` })
      .where(eq(companies.id, id));
  }

  async decrementEnabledAppsCount(id: string): Promise<void> {
    await this.db
      .update(companies)
      .set({ enabledAppsCount: sql`GREATEST(${companies.enabledAppsCount} - 1, 0)` })
      .where(eq(companies.id, id));
  }
}
