import { index, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { invitationStatusEnum } from './enums';
import { companies } from './company';
import { users } from './user';
import { roles } from './role';
import { businessUnits } from './business-unit';

/**
 * Invitations - Pending user invitations to join companies
 */
export const invitations = cloudSchema.table(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // Invitee info
    email: varchar('email', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull().unique(), // Secure invitation token
    message: text('message'), // Optional personal message

    // Role to assign on acceptance
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),

    // Additional roles (JSONB array of role IDs for multi-role assignment)
    additionalRoleIds: text('additional_role_ids'), // JSON array

    // Optional BU assignment
    businessUnitId: uuid('business_unit_id').references(() => businessUnits.id, { onDelete: 'set null' }),

    // Status tracking
    status: invitationStatusEnum('status').notNull().default('PENDING'),

    // Who sent the invitation
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // When user accepts, link to their user record
    inviteeUserId: uuid('invitee_user_id').references(() => users.id, { onDelete: 'set null' }),

    // Timestamps
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('invitations_company_id_idx').on(table.companyId),
    index('invitations_email_idx').on(table.email),
    index('invitations_token_idx').on(table.token),
    index('invitations_status_idx').on(table.status),
    index('invitations_invited_by_idx').on(table.invitedBy),
  ],
);

// Type exports
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
