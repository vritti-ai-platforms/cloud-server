import type { TableViewState } from '@vritti/api-sdk';
import { boolean, index, jsonb, timestamp, uniqueIndex, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { users } from './user';

// Table views — combines auto-saved live state (isCurrent=true) and named snapshots (isCurrent=false)
export const tableViews = cloudSchema.table(
  'table_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tableSlug: varchar('table_slug', { length: 100 }).notNull(),
    name: varchar('name', { length: 100 }), // null = auto-saved live state row
    state: jsonb('state').notNull().$type<TableViewState>(),
    isShared: boolean('is_shared').notNull().default(false),
    isCurrent: boolean('is_current').notNull().default(false), // true = auto-saved live state
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (table) => [
    index('table_views_user_table_idx').on(table.userId, table.tableSlug),
    index('table_views_shared_slug_idx').on(table.tableSlug, table.isShared),
    // Named views must have a unique name per user+table combination
    uniqueIndex('table_views_user_table_name_unique').on(table.userId, table.tableSlug, table.name),
  ],
);

// Type exports
export type TableView = typeof tableViews.$inferSelect;
export type NewTableView = typeof tableViews.$inferInsert;
