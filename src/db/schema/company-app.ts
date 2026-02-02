import { index, timestamp, unique, uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { appStatusEnum } from './enums';
import { companies } from './company';
import { apps } from './app';
import { businessUnits } from './business-unit';
import { companyMembers } from './company-member';

/**
 * CompanyApps - Apps enabled at company level
 * For company-wide defaults and billing management
 */
export const companyApps = cloudSchema.table(
  'company_apps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }),

    // Status
    status: appStatusEnum('status').notNull().default('ACTIVE'),

    // Who enabled this app
    enabledBy: uuid('enabled_by').references(() => companyMembers.id, { onDelete: 'set null' }),
    enabledAt: timestamp('enabled_at', { withTimezone: true }).notNull().defaultNow(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('company_apps_company_id_idx').on(table.companyId),
    index('company_apps_app_id_idx').on(table.appId),
    index('company_apps_status_idx').on(table.status),
    unique('company_apps_unique').on(table.companyId, table.appId),
  ],
);

/**
 * BusinessUnitApps - Apps enabled for specific business units
 * BUs can independently enable apps (no company-level prerequisite)
 */
export const businessUnitApps = cloudSchema.table(
  'business_unit_apps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    businessUnitId: uuid('business_unit_id')
      .notNull()
      .references(() => businessUnits.id, { onDelete: 'cascade' }),
    appId: uuid('app_id')
      .notNull()
      .references(() => apps.id, { onDelete: 'cascade' }), // References apps directly, NOT company_apps

    // Status
    status: appStatusEnum('status').notNull().default('ACTIVE'),

    // Who enabled this app for this BU
    enabledBy: uuid('enabled_by').references(() => companyMembers.id, { onDelete: 'set null' }),
    enabledAt: timestamp('enabled_at', { withTimezone: true }).notNull().defaultNow(),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('business_unit_apps_bu_id_idx').on(table.businessUnitId),
    index('business_unit_apps_app_id_idx').on(table.appId),
    index('business_unit_apps_status_idx').on(table.status),
    unique('business_unit_apps_unique').on(table.businessUnitId, table.appId),
  ],
);

// Type exports
export type CompanyApp = typeof companyApps.$inferSelect;
export type NewCompanyApp = typeof companyApps.$inferInsert;
export type BusinessUnitApp = typeof businessUnitApps.$inferSelect;
export type NewBusinessUnitApp = typeof businessUnitApps.$inferInsert;
