import { index, jsonb, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { companies } from './company';
import { users } from './user';

/**
 * ActivityLogs - Immutable audit trail
 * Tracks all significant actions for compliance and debugging
 */
export const activityLogs = cloudSchema.table(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Context (nullable for system-level actions)
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

    // Action details
    action: varchar('action', { length: 100 }).notNull(), // e.g., "company.created", "user.invited", "app.enabled"
    entityType: varchar('entity_type', { length: 50 }).notNull(), // e.g., "company", "business_unit", "user"
    entityId: uuid('entity_id'), // ID of the affected entity

    // Change tracking
    changes: jsonb('changes'), // { field: { old: ..., new: ... } }
    metadata: jsonb('metadata'), // Additional context (e.g., IP, user agent, extra info)

    // Request context
    ipAddress: varchar('ip_address', { length: 45 }), // IPv6 max length
    userAgent: text('user_agent'),

    // Immutable timestamp (no updatedAt since logs are immutable)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('activity_logs_company_id_idx').on(table.companyId),
    index('activity_logs_user_id_idx').on(table.userId),
    index('activity_logs_action_idx').on(table.action),
    index('activity_logs_entity_type_idx').on(table.entityType),
    index('activity_logs_entity_id_idx').on(table.entityId),
    index('activity_logs_created_at_idx').on(table.createdAt),
  ],
);

// Type exports
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
