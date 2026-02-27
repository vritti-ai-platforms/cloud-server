import { primaryKey, uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudProviders } from './cloud-provider';
import { cloudSchema } from './cloud-schema';
import { regions } from './region';

export const regionCloudProviders = cloudSchema.table(
  'region_cloud_providers',
  {
    regionId: uuid('region_id')
      .notNull()
      .references(() => regions.id, { onDelete: 'cascade' }),
    providerId: uuid('cloud_provider_id')
      .notNull()
      .references(() => cloudProviders.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.regionId, table.providerId] })],
);

export type RegionCloudProvider = typeof regionCloudProviders.$inferSelect;
export type NewRegionCloudProvider = typeof regionCloudProviders.$inferInsert;
