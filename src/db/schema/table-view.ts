import type { TableViewState } from '@vritti/api-sdk';
import { boolean, index, jsonb, timestamp, uniqueIndex, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { users } from './user';

// Named view snapshots — live state is stored in Redis only, not here
export const tableViews = cloudSchema.table(
  'table_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tableSlug: varchar('table_slug', { length: 100 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    state: jsonb('state').notNull().$type<TableViewState>(),
    isShared: boolean('is_shared').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (table) => [
    index('table_views_user_table_idx').on(table.userId, table.tableSlug),
    index('table_views_shared_slug_idx').on(table.tableSlug, table.isShared),
    // Unique name per user+table+isShared — personal and shared views can share names
    uniqueIndex('table_views_user_table_name_shared_unique').on(table.userId, table.tableSlug, table.name, table.isShared),
  ],
);

// Type exports
export type TableView = typeof tableViews.$inferSelect;
export type NewTableView = typeof tableViews.$inferInsert;
