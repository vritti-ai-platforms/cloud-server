import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, sql } from '@vritti/api-sdk/drizzle-orm';
import { businessUnits } from '@/db/schema';

type BusinessUnit = typeof businessUnits.$inferSelect;

@Injectable()
export class BusinessUnitRepository extends PrimaryBaseRepository<typeof businessUnits> {
  constructor(database: PrimaryDatabaseService) {
    super(database, businessUnits);
  }

  async findByCompanyId(companyId: string): Promise<BusinessUnit[]> {
    // Use Drizzle v2 object-based filter syntax for relational queries
    return this.model.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async incrementEmployeesCount(id: string): Promise<void> {
    await this.db
      .update(businessUnits)
      .set({ employeesCount: sql`${businessUnits.employeesCount} + 1` })
      .where(eq(businessUnits.id, id));
  }

  async decrementEmployeesCount(id: string): Promise<void> {
    await this.db
      .update(businessUnits)
      .set({ employeesCount: sql`GREATEST(${businessUnits.employeesCount} - 1, 0)` })
      .where(eq(businessUnits.id, id));
  }

  async incrementEnabledAppsCount(id: string): Promise<void> {
    await this.db
      .update(businessUnits)
      .set({ enabledAppsCount: sql`${businessUnits.enabledAppsCount} + 1` })
      .where(eq(businessUnits.id, id));
  }

  async decrementEnabledAppsCount(id: string): Promise<void> {
    await this.db
      .update(businessUnits)
      .set({ enabledAppsCount: sql`GREATEST(${businessUnits.enabledAppsCount} - 1, 0)` })
      .where(eq(businessUnits.id, id));
  }
}
