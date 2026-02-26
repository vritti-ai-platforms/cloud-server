import { primaryKey, uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { industries } from './industry';
import { plans } from './plan';

export const industryPlans = cloudSchema.table(
  'industry_plans',
  {
    industryId: uuid('industry_id')
      .notNull()
      .references(() => industries.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.industryId, table.planId] })],
);

export type IndustryPlan = typeof industryPlans.$inferSelect;
export type NewIndustryPlan = typeof industryPlans.$inferInsert;
