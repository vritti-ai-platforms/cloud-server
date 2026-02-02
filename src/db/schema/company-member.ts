import { index, timestamp, unique, uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { membershipStatusEnum } from './enums';
import { companies } from './company';
import { users } from './user';
import { roles } from './role';

/**
 * CompanyMembers - User-company membership
 * Links users to companies they belong to
 */
export const companyMembers = cloudSchema.table(
  'company_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Membership status
    status: membershipStatusEnum('status').notNull().default('ACTIVE'),

    // Tracking
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('company_members_company_id_idx').on(table.companyId),
    index('company_members_user_id_idx').on(table.userId),
    index('company_members_status_idx').on(table.status),
    unique('company_members_unique').on(table.companyId, table.userId),
  ],
);

/**
 * MemberRoles - Company-wide role assignments
 * A company member can have multiple roles
 */
export const memberRoles = cloudSchema.table(
  'member_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyMemberId: uuid('company_member_id')
      .notNull()
      .references(() => companyMembers.id, { onDelete: 'cascade' }),
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
    index('member_roles_member_id_idx').on(table.companyMemberId),
    index('member_roles_role_id_idx').on(table.roleId),
    unique('member_roles_unique').on(table.companyMemberId, table.roleId),
  ],
);

// Type exports
export type CompanyMember = typeof companyMembers.$inferSelect;
export type NewCompanyMember = typeof companyMembers.$inferInsert;
export type MemberRole = typeof memberRoles.$inferSelect;
export type NewMemberRole = typeof memberRoles.$inferInsert;
