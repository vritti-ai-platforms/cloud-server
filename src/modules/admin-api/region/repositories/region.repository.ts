import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { asc, count, eq, type SQL, sql } from '@vritti/api-sdk/drizzle-orm';
import type { Region } from '@/db/schema';
import { cloudProviders, regionCloudProviders, regions } from '@/db/schema';

type RegionWithProviders = Region & {
  providerCount: number;
  providers: Array<{ id: string; name: string; logoUrl: string | null; logoDarkUrl: string | null }>;
};

@Injectable()
export class RegionRepository extends PrimaryBaseRepository<typeof regions> {
  constructor(database: PrimaryDatabaseService) {
    super(database, regions);
  }

  // Returns all regions ordered by name ascending
  async findAll(): Promise<Region[]> {
    return this.model.findMany({ orderBy: { name: 'asc' } });
  }

  // Returns paginated regions with provider count and provider details, filtered/sorted
  async findAllWithCounts(options: {
    where?: SQL;
    orderBy?: SQL[];
    limit?: number;
    offset?: number;
  }): Promise<{ rows: RegionWithProviders[]; total: number }> {
    const { where, orderBy, limit = 20, offset = 0 } = options;
    const [countResult, rows] = await Promise.all([
      this.db
        .select({ total: count() })
        .from(regions)
        .where(where)
        .then((r) => r[0]?.total ?? 0),
      this.db
        .select({
          id: regions.id,
          name: regions.name,
          code: regions.code,
          country: regions.country,
          state: regions.state,
          city: regions.city,
          isActive: regions.isActive,
          createdAt: regions.createdAt,
          updatedAt: regions.updatedAt,
          providerCount: count(regionCloudProviders.providerId),
          providers: sql<Array<{ id: string; name: string; logoUrl: string | null; logoDarkUrl: string | null }>>`
            json_agg(
              json_build_object(
                'id', ${cloudProviders.id},
                'name', ${cloudProviders.name},
                'logoUrl', ${cloudProviders.logoUrl},
                'logoDarkUrl', ${cloudProviders.logoDarkUrl}
              )
            ) FILTER (WHERE ${cloudProviders.id} IS NOT NULL)
          `,
        })
        .from(regions)
        .leftJoin(regionCloudProviders, eq(regionCloudProviders.regionId, regions.id))
        .leftJoin(cloudProviders, eq(cloudProviders.id, regionCloudProviders.providerId))
        .where(where)
        .groupBy(regions.id)
        .orderBy(...(orderBy && orderBy.length > 0 ? orderBy : [asc(regions.name)]))
        .limit(limit)
        .offset(offset),
    ]);
    return { rows: rows, total: Number(countResult) };
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
