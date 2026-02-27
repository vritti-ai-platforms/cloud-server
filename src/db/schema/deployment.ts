import { timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudProviders } from './cloud-provider';
import { cloudSchema } from './cloud-schema';
import { deploymentStatusEnum, deploymentTypeEnum } from './enums';
import { regions } from './region';

export const deployments = cloudSchema.table('deployments', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  nexusUrl: varchar('nexus_url', { length: 500 }).notNull(),
  webhookSecret: varchar('webhook_secret', { length: 500 }).notNull(),
  regionId: uuid('region_id')
    .notNull()
    .references(() => regions.id, { onDelete: 'restrict' }),
  cloudProviderId: uuid('cloud_provider_id')
    .notNull()
    .references(() => cloudProviders.id, { onDelete: 'restrict' }),
  status: deploymentStatusEnum('status').notNull().default('Provisioning'),
  type: deploymentTypeEnum('type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
});

export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
