import { boolean, index, integer, text, timestamp, unique, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { companies } from './company';

/**
 * Roles - Per-company role definitions
 * Each company has its own set of roles (system + custom)
 */
export const roles = cloudSchema.table(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // Role info
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    // UI customization
    color: varchar('color', { length: 7 }), // Hex color e.g., "#6366f1"
    icon: varchar('icon', { length: 50 }), // Lucide icon name

    // System roles cannot be deleted/modified (Owner, Admin, Manager, Employee)
    isSystem: boolean('is_system').notNull().default(false),

    // Denormalized count for performance
    userCount: integer('user_count').notNull().default(0),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('roles_company_id_idx').on(table.companyId),
    index('roles_is_system_idx').on(table.isSystem),
    unique('roles_company_name_unique').on(table.companyId, table.name),
  ],
);

/**
 * RolePermissions - Maps permissions to roles
 * Junction table for role-permission many-to-many relationship
 */
export const rolePermissions = cloudSchema.table(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),

    // Permission code (e.g., "users.view", "crm.leads.create")
    // Using VARCHAR instead of FK to permissions table for flexibility
    permissionCode: varchar('permission_code', { length: 100 }).notNull(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('role_permissions_role_id_idx').on(table.roleId),
    index('role_permissions_code_idx').on(table.permissionCode),
    unique('role_permissions_unique').on(table.roleId, table.permissionCode),
  ],
);

// Type exports
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
