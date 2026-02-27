import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, eq } from '@vritti/api-sdk/drizzle-orm';
import type { Region } from '@/db/schema';
import { regionProviders, regions } from '@/db/schema';

@Injectable()
export class RegionRepository extends PrimaryBaseRepository<typeof regions> {
  constructor(database: PrimaryDatabaseService) {
    super(database, regions);
  }

  // Returns all regions ordered by name ascending
  async findAll(): Promise<Region[]> {
    return this.model.findMany({ orderBy: { name: 'asc' } });
  }

  // Returns all regions with a count of assigned providers
  async findAllWithCounts(): Promise<Array<Region & { providerCount: number }>> {
    const rows = await this.db
      .select({
        id: regions.id,
        name: regions.name,
        code: regions.code,
        state: regions.state,
        city: regions.city,
        createdAt: regions.createdAt,
        updatedAt: regions.updatedAt,
        providerCount: count(regionProviders.providerId),
      })
      .from(regions)
      .leftJoin(regionProviders, eq(regionProviders.regionId, regions.id))
      .groupBy(regions.id)
      .orderBy(asc(regions.name));
    return rows as Array<Region & { providerCount: number }>;
  }

  // Finds a region by its unique identifier
  async findById(id: string): Promise<Region | undefined> {
    return this.model.findFirst({ where: { id } });
  }

  // Finds a region by its unique code
  async findByCode(code: string): Promise<Region | undefined> {
    return this.model.findFirst({ where: { code } });
  }
}
