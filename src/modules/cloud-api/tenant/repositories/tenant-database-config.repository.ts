import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { tenantDatabaseConfigs } from '@/db/schema';

type TenantDatabaseConfig = typeof tenantDatabaseConfigs.$inferSelect;
type NewTenantDatabaseConfig = typeof tenantDatabaseConfigs.$inferInsert;

@Injectable()
export class TenantDatabaseConfigRepository extends PrimaryBaseRepository<typeof tenantDatabaseConfigs> {
  constructor(database: PrimaryDatabaseService) {
    super(database, tenantDatabaseConfigs);
  }

  // Finds a database configuration by tenant ID
  async findByTenantId(tenantId: string): Promise<TenantDatabaseConfig | undefined> {
    // Use object-based filter for Drizzle v2 relational API
    return this.findOne({ tenantId });
  }

  // Updates database configuration fields for the given tenant
  async updateByTenantId(tenantId: string, data: Partial<NewTenantDatabaseConfig>): Promise<TenantDatabaseConfig> {
    this.logger.log(`Updating ${this.constructor.name} for tenant: ${tenantId}`);
    const [result] = await this.db
      .update(tenantDatabaseConfigs)
      .set(data)
      .where(eq(tenantDatabaseConfigs.tenantId, tenantId))
      .returning();
    return result;
  }

  // Deletes the database configuration for the given tenant
  async deleteByTenantId(tenantId: string): Promise<TenantDatabaseConfig> {
    this.logger.log(`Deleting ${this.constructor.name} for tenant: ${tenantId}`);
    const [result] = await this.db
      .delete(tenantDatabaseConfigs)
      .where(eq(tenantDatabaseConfigs.tenantId, tenantId))
      .returning();
    return result;
  }
}
