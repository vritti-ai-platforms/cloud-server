import { numeric, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { providers } from './cloud-provider';
import { cloudSchema } from './cloud-schema';
import { industries } from './industry';
import { plans } from './plan';
import { regions } from './region';

export const prices = cloudSchema.table('prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id, { onDelete: 'restrict' }),
  industryId: uuid('industry_id')
    .notNull()
    .references(() => industries.id, { onDelete: 'restrict' }),
  regionId: uuid('region_id')
    .notNull()
    .references(() => regions.id, { onDelete: 'restrict' }),
  providerId: uuid('cloud_provider_id')
    .notNull()
    .references(() => providers.id, { onDelete: 'restrict' }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
});

export type Price = typeof prices.$inferSelect;
export type NewPrice = typeof prices.$inferInsert;
