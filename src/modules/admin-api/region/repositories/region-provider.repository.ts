import { Injectable } from '@nestjs/common';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { eq, and } from '@vritti/api-sdk/drizzle-orm';
import type { CloudProvider } from '@/db/schema';
import { cloudProviders, regionCloudProviders } from '@/db/schema';

@Injectable()
export class RegionProviderRepository {
  constructor(private readonly database: PrimaryDatabaseService) {}

  // Bulk-inserts region-cloud-provider pairs; skips duplicates via onConflictDoNothing
  async bulkInsert(regionId: string, cloudProviderIds: string[]): Promise<number> {
    const rows = cloudProviderIds.map((providerId) => ({ regionId, providerId }));
    const result = await this.database.drizzleClient.insert(regionCloudProviders).values(rows).onConflictDoNothing();
    return result.rowCount ?? rows.length;
  }

  // JOINs regionCloudProviders with cloudProviders to return provider rows for a region
  async findProvidersByRegionId(regionId: string): Promise<CloudProvider[]> {
    return this.database.drizzleClient
      .select({
        id: cloudProviders.id,
        name: cloudProviders.name,
        code: cloudProviders.code,
        logoUrl: cloudProviders.logoUrl,
        logoDarkUrl: cloudProviders.logoDarkUrl,
        createdAt: cloudProviders.createdAt,
        updatedAt: cloudProviders.updatedAt,
      })
      .from(regionCloudProviders)
      .innerJoin(cloudProviders, eq(regionCloudProviders.providerId, cloudProviders.id))
      .where(eq(regionCloudProviders.regionId, regionId));
  }

  // Deletes the assignment row for a given region-provider pair
  async deleteByRegionAndProvider(regionId: string, providerId: string): Promise<void> {
    await this.database.drizzleClient
      .delete(regionCloudProviders)
      .where(and(eq(regionCloudProviders.regionId, regionId), eq(regionCloudProviders.providerId, providerId)));
  }
}
