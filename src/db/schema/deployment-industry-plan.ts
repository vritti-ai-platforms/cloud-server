import { primaryKey, uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { deployments } from './deployment';
import { industries } from './industry';
import { plans } from './plan';

export const deploymentIndustryPlans = cloudSchema.table(
  'deployment_industry_plans',
  {
    deploymentId: uuid('deployment_id')
      .notNull()
      .references(() => deployments.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'restrict' }),
    industryId: uuid('industry_id')
      .notNull()
      .references(() => industries.id, { onDelete: 'restrict' }),
  },
  (table) => [primaryKey({ columns: [table.deploymentId, table.planId, table.industryId] })],
);

export type DeploymentIndustryPlan = typeof deploymentIndustryPlans.$inferSelect;
export type NewDeploymentIndustryPlan = typeof deploymentIndustryPlans.$inferInsert;
