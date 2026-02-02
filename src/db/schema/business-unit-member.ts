import { boolean, index, timestamp, unique, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { membershipStatusEnum } from './enums';
import { businessUnits } from './business-unit';
import { companyMembers } from './company-member';
import { roles } from './role';

/**
 * BusinessUnitMembers - User-BU assignment
 * Assigns company members to specific business units
 */
export const businessUnitMembers = cloudSchema.table(
  'business_unit_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessUnitId: uuid('business_unit_id')
      .notNull()
      .references(() => businessUnits.id, { onDelete: 'cascade' }),
    companyMemberId: uuid('company_member_id')
      .notNull()
      .references(() => companyMembers.id, { onDelete: 'cascade' }),

    // Assignment details
    title: varchar('title', { length: 100 }), // Job title in this BU
    isPrimary: boolean('is_primary').notNull().default(false), // Primary BU for the user
    status: membershipStatusEnum('status').notNull().default('ACTIVE'),

    // Tracking
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid('assigned_by').references(() => companyMembers.id, { onDelete: 'set null' }),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('business_unit_members_bu_id_idx').on(table.businessUnitId),
    index('business_unit_members_member_id_idx').on(table.companyMemberId),
    index('business_unit_members_primary_idx').on(table.isPrimary),
    unique('business_unit_members_unique').on(table.businessUnitId, table.companyMemberId),
  ],
);

/**
 * BusinessUnitMemberRoles - BU-specific role assignments
 * Users can have different roles in different BUs
 */
export const businessUnitMemberRoles = cloudSchema.table(
  'business_unit_member_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessUnitMemberId: uuid('business_unit_member_id')
      .notNull()
      .references(() => businessUnitMembers.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),

    // Who assigned this role
    assignedBy: uuid('assigned_by').references(() => companyMembers.id, { onDelete: 'set null' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('bu_member_roles_bu_member_id_idx').on(table.businessUnitMemberId),
    index('bu_member_roles_role_id_idx').on(table.roleId),
    unique('bu_member_roles_unique').on(table.businessUnitMemberId, table.roleId),
  ],
);

// Type exports
export type BusinessUnitMember = typeof businessUnitMembers.$inferSelect;
export type NewBusinessUnitMember = typeof businessUnitMembers.$inferInsert;
export type BusinessUnitMemberRole = typeof businessUnitMemberRoles.$inferSelect;
export type NewBusinessUnitMemberRole = typeof businessUnitMemberRoles.$inferInsert;
