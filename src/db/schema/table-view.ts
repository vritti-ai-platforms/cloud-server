import { dataTableViewsColumns, dataTableViewsIndexes } from '@vritti/api-sdk';
import { uuid } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { users } from './user';

export const tableViews = cloudSchema.table(
  'table_views',
  {
    ...dataTableViewsColumns(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  },
  dataTableViewsIndexes,
);

export type TableView = typeof tableViews.$inferSelect;
export type NewTableView = typeof tableViews.$inferInsert;
