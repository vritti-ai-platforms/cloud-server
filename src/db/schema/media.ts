import { bigint, index, jsonb, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { mediaStatusEnum } from './enums';

export const media = cloudSchema.table(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    checksum: varchar('checksum', { length: 128 }),
    storageKey: varchar('storage_key', { length: 512 }).notNull(),
    bucket: varchar('bucket', { length: 255 }),
    provider: varchar('provider', { length: 50 }).notNull(),
    status: mediaStatusEnum('status').notNull().default('pending'),
    entityType: varchar('entity_type', { length: 255 }).notNull(),
    entityId: varchar('entity_id', { length: 255 }).notNull(),
    uploadedBy: uuid('uploaded_by'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_media_entity').on(table.entityType, table.entityId),
    index('idx_media_uploaded_by').on(table.uploadedBy),
    index('idx_media_status').on(table.status),
    index('idx_media_checksum').on(table.checksum),
  ],
);

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
