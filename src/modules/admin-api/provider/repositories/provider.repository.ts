import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, eq } from '@vritti/api-sdk/drizzle-orm';
import type { Provider } from '@/db/schema';
import { providers, regionProviders } from '@/db/schema';

@Injectable()
export class ProviderRepository extends PrimaryBaseRepository<typeof providers> {
  constructor(database: PrimaryDatabaseService) {
    super(database, providers);
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
        id: providers.id,
        name: providers.name,
        code: providers.code,
        createdAt: providers.createdAt,
        updatedAt: providers.updatedAt,
        regionCount: count(regionProviders.regionId),
      })
      .from(providers)
      .leftJoin(regionProviders, eq(regionProviders.providerId, providers.id))
      .groupBy(providers.id)
      .orderBy(asc(providers.name));
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
