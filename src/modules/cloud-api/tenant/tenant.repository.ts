import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { tenants } from '@/db/schema';

type Tenant = typeof tenants.$inferSelect;

@Injectable()
export class TenantRepository extends PrimaryBaseRepository<typeof tenants> {
  constructor(database: PrimaryDatabaseService) {
    super(database, tenants);
  }

  /**
   * Find all tenants ordered by creation date
   */
  async findAll(): Promise<Tenant[]> {
    return this.model.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find tenant by ID with database configuration included
   */
  async findByIdWithConfig(id: string) {
    // Use Drizzle v2 object-based filter syntax for relational queries
    return this.model.findFirst({
      where: { id },
      with: { databaseConfig: true },
    });
  }

  /**
   * Find tenant by subdomain
   * @param includeConfig - Whether to include database configuration
   */
  async findBySubdomain(subdomain: string, includeConfig = false) {
    // Use Drizzle v2 object-based filter syntax for relational queries
    if (!includeConfig) {
      return this.model.findFirst({
        where: { subdomain },
      });
    }
    return this.model.findFirst({
      where: { subdomain },
      with: { databaseConfig: true },
    });
  }
}
