import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, asc, count, eq, inArray, sql, type SQL } from '@vritti/api-sdk/drizzle-orm';
import type { Region } from '@/db/schema';
import { cloudProviders, regionCloudProviders, regions } from '@/db/schema';

@Injectable()
export class RegionRepository extends PrimaryBaseRepository<typeof regions> {
  constructor(database: PrimaryDatabaseService) {
    super(database, regions);
  }

  // Returns all regions ordered by name ascending
  async findAll(): Promise<Region[]> {
    return this.model.findMany({ orderBy: { name: 'asc' } });
  }

  // Returns all regions with provider count and provider details, filtered/sorted; optionally filtered to regions with a specific provider
  async findAllWithCounts(
    where?: SQL,
    orderBy?: SQL[],
    providerId?: string,
  ): Promise<Array<Region & { providerCount: number; providers: Array<{ id: string; name: string; logoUrl: string | null; logoDarkUrl: string | null }> }>> {
    const providerCondition = providerId
      ? inArray(
          regions.id,
          this.db.select({ id: regionCloudProviders.regionId }).from(regionCloudProviders).where(eq(regionCloudProviders.providerId, providerId)),
        )
      : undefined;
    const rows = await this.db
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
      .where(and(where, providerCondition))
      .groupBy(regions.id)
      .orderBy(...(orderBy && orderBy.length > 0 ? orderBy : [asc(regions.name)]));
    return rows as Array<Region & { providerCount: number; providers: Array<{ id: string; name: string; logoUrl: string | null; logoDarkUrl: string | null }> }>;
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
