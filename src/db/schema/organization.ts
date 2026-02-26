import { integer, timestamp, uniqueIndex, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { orgMemberRoleEnum, orgPlanEnum, orgSizeEnum } from './enums';
import { users } from './user';

// Organizations table - workspace entities created by users
export const organizations = cloudSchema.table('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  subdomain: varchar('subdomain', { length: 100 }).notNull().unique(),
  orgIdentifier: varchar('org_identifier', { length: 100 }).notNull().unique(),
  industryId: integer('industry_id'),
  size: orgSizeEnum('size').notNull(),
  mediaId: varchar('media_id', { length: 255 }),
  plan: orgPlanEnum('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
});

// Organization members table - links users to organizations with roles
export const organizationMembers = cloudSchema.table(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: orgMemberRoleEnum('role').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('org_member_unique_idx').on(table.organizationId, table.userId)],
);

// Type exports
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
