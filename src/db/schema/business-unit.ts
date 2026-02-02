import { boolean, index, integer, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { businessUnitStatusEnum, businessUnitTypeEnum } from './enums';
import { companies } from './company';

/**
 * Business Units - Branches, locations, or departments within a company
 * Flat structure (no hierarchy) for simplicity
 */
export const businessUnits = cloudSchema.table(
  'business_units',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // Basic information
    name: varchar('name', { length: 255 }).notNull(),
    code: varchar('code', { length: 50 }), // Short code like "HQ", "NBR", "WH1"
    type: businessUnitTypeEnum('type').notNull().default('OFFICE'), // OUTLET, CLINIC, WAREHOUSE, HUB, HQ, OFFICE, OTHER
    description: text('description'),
    status: businessUnitStatusEnum('status').notNull().default('ACTIVE'),

    // Contact information
    phone: varchar('phone', { length: 20 }),
    email: varchar('email', { length: 255 }),

    // Address
    addressLine1: varchar('address_line_1', { length: 255 }),
    addressLine2: varchar('address_line_2', { length: 255 }),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    postalCode: varchar('postal_code', { length: 20 }),
    country: varchar('country', { length: 100 }),

    // Manager reference (will be linked to company_members after that table is created)
    managerId: uuid('manager_id'),

    // Denormalized statistics
    employeesCount: integer('employees_count').notNull().default(0),
    enabledAppsCount: integer('enabled_apps_count').notNull().default(0),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('business_units_company_id_idx').on(table.companyId),
    index('business_units_status_idx').on(table.status),
  ],
);

// Type exports
export type BusinessUnit = typeof businessUnits.$inferSelect;
export type NewBusinessUnit = typeof businessUnits.$inferInsert;
