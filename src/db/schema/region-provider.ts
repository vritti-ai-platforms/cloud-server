import { primaryKey, uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { providers } from './provider';
import { regions } from './region';

export const regionProviders = cloudSchema.table(
  'region_providers',
  {
    regionId: uuid('region_id')
      .notNull()
      .references(() => regions.id, { onDelete: 'cascade' }),
    providerId: uuid('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.regionId, table.providerId] })],
);

export type RegionProvider = typeof regionProviders.$inferSelect;
export type NewRegionProvider = typeof regionProviders.$inferInsert;
