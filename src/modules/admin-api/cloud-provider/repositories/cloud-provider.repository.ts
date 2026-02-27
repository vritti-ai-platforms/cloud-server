import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, eq } from '@vritti/api-sdk/drizzle-orm';
import type { Provider } from '@/db/schema';
import { cloudProviders, regionCloudProviders } from '@/db/schema';

@Injectable()
export class CloudProviderRepository extends PrimaryBaseRepository<typeof cloudProviders> {
  constructor(database: PrimaryDatabaseService) {
    super(database, cloudProviders);
  }

  // Returns all providers ordered by name ascending
  async findAll(): Promise<Provider[]> {
    return this.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Returns all providers with a count of assigned regions
  async findAllWithCounts(): Promise<Array<Provider & { regionCount: number }>> {
    const rows = await this.db
      .select({
        id: cloudProviders.id,
        name: cloudProviders.name,
        code: cloudProviders.code,
        createdAt: cloudProviders.createdAt,
        updatedAt: cloudProviders.updatedAt,
        regionCount: count(regionCloudProviders.regionId),
      })
      .from(cloudProviders)
      .leftJoin(regionCloudProviders, eq(regionCloudProviders.providerId, cloudProviders.id))
      .groupBy(cloudProviders.id)
      .orderBy(asc(cloudProviders.name));
    return rows as Array<Provider & { regionCount: number }>;
  }

  // Finds a provider by its unique identifier
  async findById(id: string): Promise<Provider | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  async findByCode(code: string): Promise<Provider | undefined> {
    return this.model.findFirst({ where: { code } });
  }
}
