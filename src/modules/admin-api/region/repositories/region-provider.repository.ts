import { Injectable } from '@nestjs/common';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { regionCloudProviders } from '@/db/schema';

@Injectable()
export class RegionProviderRepository {
  constructor(private readonly database: PrimaryDatabaseService) {}

  // Bulk-inserts region-cloud-provider pairs; skips duplicates via onConflictDoNothing
  async bulkInsert(regionId: string, cloudProviderIds: string[]): Promise<number> {
    const rows = cloudProviderIds.map((providerId) => ({ regionId, providerId }));
    const result = await this.database.drizzleClient.insert(regionCloudProviders).values(rows).onConflictDoNothing();
    return result.rowCount ?? rows.length;
  }
}
