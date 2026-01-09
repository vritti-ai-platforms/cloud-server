import { integer, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { databaseTypeEnum, tenantStatusEnum } from './enums';

/**
 * Tenant registry - stores configuration for all tenants
 */
export const tenants = cloudSchema.table('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  subdomain: varchar('subdomain', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  dbType: databaseTypeEnum('db_type').notNull().default('SHARED'),
  status: tenantStatusEnum('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Tenant database configuration - stores database connection details
 * This table contains sensitive information and should be encrypted at rest
 */
export const tenantDatabaseConfigs = cloudSchema.table('tenant_database_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  dbHost: varchar('db_host', { length: 255 }).notNull(),
  dbPort: integer('db_port').notNull(),
  dbUsername: varchar('db_username', { length: 255 }).notNull(),
  dbPassword: varchar('db_password', { length: 255 }).notNull(),
  dbName: varchar('db_name', { length: 255 }).notNull(),
  dbSchema: varchar('db_schema', { length: 255 }),
  dbSslMode: varchar('db_ssl_mode', { length: 50 }).notNull().default('require'),
  connectionPoolSize: integer('connection_pool_size').notNull().default(10),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Type exports
export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
export type TenantDatabaseConfig = typeof tenantDatabaseConfigs.$inferSelect;
export type NewTenantDatabaseConfig = typeof tenantDatabaseConfigs.$inferInsert;
