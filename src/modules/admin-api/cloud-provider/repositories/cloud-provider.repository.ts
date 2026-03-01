import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, eq, type SQL } from '@vritti/api-sdk/drizzle-orm';
import type { CloudProvider } from '@/db/schema';
import { cloudProviders, regionCloudProviders } from '@/db/schema';

@Injectable()
export class CloudProviderRepository extends PrimaryBaseRepository<typeof cloudProviders> {
  constructor(database: PrimaryDatabaseService) {
    super(database, cloudProviders);
  }

  // Returns all providers ordered by name ascending
  async findAll(): Promise<CloudProvider[]> {
    return this.model.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Returns all providers with a count of assigned regions; applies optional where/orderBy from FilterProcessor
  async findAllWithCounts(
    where?: SQL,
    orderBy?: SQL[],
  ): Promise<Array<CloudProvider & { regionCount: number }>> {
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
      .where(where)
      .groupBy(cloudProviders.id)
      .orderBy(...(orderBy && orderBy.length > 0 ? orderBy : [asc(cloudProviders.name)]));
    return rows as Array<CloudProvider & { regionCount: number }>;
  }

  // Finds a provider by its unique identifier
  async findById(id: string): Promise<CloudProvider | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  async findByCode(code: string): Promise<CloudProvider | undefined> {
    return this.model.findFirst({ where: { code } });
  }
}
