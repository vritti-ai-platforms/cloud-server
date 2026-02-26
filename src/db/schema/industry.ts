import { uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';

export const industries = cloudSchema.table('industries', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
});

export type Industry = typeof industries.$inferSelect;
export type NewIndustry = typeof industries.$inferInsert;
