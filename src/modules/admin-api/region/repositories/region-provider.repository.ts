import { Injectable } from '@nestjs/common';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { regionProviders } from '@/db/schema';

@Injectable()
export class RegionProviderRepository {
  constructor(private readonly database: PrimaryDatabaseService) {}

  // Bulk-inserts region-provider pairs; skips duplicates via onConflictDoNothing
  async bulkInsert(regionId: string, providerIds: string[]): Promise<number> {
    const rows = providerIds.map((providerId) => ({ regionId, providerId }));
    const result = await this.database.drizzleClient
      .insert(regionProviders)
      .values(rows)
      .onConflictDoNothing();
    return result.rowCount ?? rows.length;
  }
}
