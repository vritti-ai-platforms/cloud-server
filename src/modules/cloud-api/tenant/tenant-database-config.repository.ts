import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { tenantDatabaseConfigs } from '@/db/schema';

type TenantDatabaseConfig = typeof tenantDatabaseConfigs.$inferSelect;
type NewTenantDatabaseConfig = typeof tenantDatabaseConfigs.$inferInsert;

/**
 * Repository for managing tenant database configuration data access
 * Handles CRUD operations for tenant database connection details
 */
@Injectable()
export class TenantDatabaseConfigRepository extends PrimaryBaseRepository<typeof tenantDatabaseConfigs> {
  constructor(database: PrimaryDatabaseService) {
    super(database, tenantDatabaseConfigs);
  }

  /**
   * Find tenant database configuration by tenant ID
   * @param tenantId - ID of the tenant
   * @returns Configuration or undefined if not found
   */
  async findByTenantId(tenantId: string): Promise<TenantDatabaseConfig | undefined> {
    // Use object-based filter for Drizzle v2 relational API
    return this.findOne({ tenantId });
  }

  /**
   * Updates a tenant database configuration by tenant ID
   * Note: This method is necessary because the schema uses tenantId (unique) not id as the primary lookup
   * @param tenantId - ID of the tenant
   * @param data - Data to update
   * @returns Updated configuration
   */
  async updateByTenantId(tenantId: string, data: Partial<NewTenantDatabaseConfig>): Promise<TenantDatabaseConfig> {
    this.logger.log(`Updating ${this.constructor.name} for tenant: ${tenantId}`);
    const [result] = await this.db
      .update(tenantDatabaseConfigs)
      .set(data)
      .where(eq(tenantDatabaseConfigs.tenantId, tenantId))
      .returning();
    return result;
  }

  /**
   * Deletes a tenant database configuration by tenant ID
   * Note: This method is necessary because the schema uses tenantId (unique) not id as the primary lookup
   * @param tenantId - ID of the tenant
   * @returns Deleted configuration
   */
  async deleteByTenantId(tenantId: string): Promise<TenantDatabaseConfig> {
    this.logger.log(`Deleting ${this.constructor.name} for tenant: ${tenantId}`);
    const [result] = await this.db
      .delete(tenantDatabaseConfigs)
      .where(eq(tenantDatabaseConfigs.tenantId, tenantId))
      .returning();
    return result;
  }
}
