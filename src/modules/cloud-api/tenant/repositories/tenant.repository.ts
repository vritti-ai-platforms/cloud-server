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

  // Retrieves all tenants ordered by creation date descending
  async findAll(): Promise<Tenant[]> {
    return this.model.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Finds a tenant by ID including its database configuration
  async findByIdWithConfig(id: string) {
    return this.model.findFirst({
      where: eq(tenants.id, id),
      with: { databaseConfig: true },
    });
  }

  // Finds a tenant by subdomain, optionally including database configuration
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
