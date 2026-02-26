import { primaryKey, uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { deployments } from './deployment';
import { industries } from './industry';

export const industryDeployments = cloudSchema.table(
  'industry_deployments',
  {
    industryId: uuid('industry_id')
      .notNull()
      .references(() => industries.id, { onDelete: 'cascade' }),
    deploymentId: uuid('deployment_id')
      .notNull()
      .references(() => deployments.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.industryId, table.deploymentId] })],
);

export type IndustryDeployment = typeof industryDeployments.$inferSelect;
export type NewIndustryDeployment = typeof industryDeployments.$inferInsert;
