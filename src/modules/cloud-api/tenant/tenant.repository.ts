import { Injectable } from '@nestjs/common';
import {
  PrimaryBaseRepository,
  PrimaryDatabaseService,
} from '@vritti/api-sdk';
import { eq, desc } from '@vritti/api-sdk/drizzle-orm';
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
      orderBy: desc(tenants.createdAt),
    });
  }

  /**
   * Find tenant by ID with database configuration included
   */
  async findByIdWithConfig(id: string) {
    return this.model.findFirst({
      where: eq(tenants.id, id),
      with: { databaseConfig: true },
    });
  }

  /**
   * Find tenant by subdomain
   * @param includeConfig - Whether to include database configuration
   */
  async findBySubdomain(subdomain: string, includeConfig = false) {
    if (!includeConfig) {
      return this.model.findFirst({
        where: eq(tenants.subdomain, subdomain),
      });
    }
    return this.model.findFirst({
      where: eq(tenants.subdomain, subdomain),
      with: { databaseConfig: true },
    });
  }
}
