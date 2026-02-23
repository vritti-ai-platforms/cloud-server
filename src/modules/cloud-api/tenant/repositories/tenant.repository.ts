import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
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
      where: { id },
      with: { databaseConfig: true },
    });
  }

  // Finds a tenant by subdomain, optionally including database configuration
  async findBySubdomain(subdomain: string, includeConfig = false) {
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
