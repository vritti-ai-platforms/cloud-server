import { primaryKey, uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { providers } from './cloud-provider';
import { cloudSchema } from './cloud-schema';
import { regions } from './region';

export const regionProviders = cloudSchema.table(
  'region_cloud_providers',
  {
    regionId: uuid('region_id')
      .notNull()
      .references(() => regions.id, { onDelete: 'cascade' }),
    providerId: uuid('cloud_provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.regionId, table.providerId] })],
);

export type RegionProvider = typeof regionProviders.$inferSelect;
export type NewRegionProvider = typeof regionProviders.$inferInsert;
