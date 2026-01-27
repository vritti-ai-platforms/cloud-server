import { boolean, index, integer, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import {
  companySizeEnum,
  databaseHealthEnum,
  databaseRegionEnum,
  industryTypeEnum,
} from './enums';
import { tenants } from './tenant';

/**
 * Companies - Extended company profile that builds on tenants
 * Each company maps to a tenant and includes business-specific information
 */
export const companies = cloudSchema.table(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .unique()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    // Basic company information
    industry: industryTypeEnum('industry').notNull(),
    size: companySizeEnum('size').notNull(),
    logoUrl: text('logo_url'),

    // Locale settings
    timezone: varchar('timezone', { length: 50 }).notNull().default('Asia/Kolkata'),
    currency: varchar('currency', { length: 3 }).notNull().default('INR'),

    // Database configuration
    dbRegion: databaseRegionEnum('db_region'),
    dbHealth: databaseHealthEnum('db_health').notNull().default('HEALTHY'),
    lastHealthCheckAt: timestamp('last_health_check_at', { withTimezone: true }),

    // Denormalized statistics for performance
    usersCount: integer('users_count').notNull().default(0),
    businessUnitsCount: integer('business_units_count').notNull().default(0),
    enabledAppsCount: integer('enabled_apps_count').notNull().default(0),

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('companies_tenant_id_idx').on(table.tenantId),
    index('companies_industry_idx').on(table.industry),
  ],
);

// Type exports
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
