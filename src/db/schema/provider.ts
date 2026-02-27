import { timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';

export const providers = cloudSchema.table('providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
});

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
