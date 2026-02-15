import { boolean, index, integer, jsonb, text, timestamp, unique, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import {
  channelTypeEnum,
  conversationStatusEnum,
  inboxStatusEnum,
  messageSenderTypeEnum,
  messageStatusEnum,
  messageTypeEnum,
} from './enums';
import { tenants } from './tenant';
import { users } from './user';

/**
 * Inbox - a configured connection to a messaging channel
 */
export const inboxes = cloudSchema.table(
  'inboxes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    channelType: channelTypeEnum('channel_type').notNull(),
    status: inboxStatusEnum('status').notNull().default('PENDING'),
    channelConfig: jsonb('channel_config').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('inboxes_tenant_id_channel_type_idx').on(table.tenantId, table.channelType)],
);

/**
 * Contact - an external person who messages the tenant through any channel
 */
export const contacts = cloudSchema.table(
  'contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    phone: varchar('phone', { length: 20 }),
    username: varchar('username', { length: 255 }),
    email: varchar('email', { length: 255 }),
    customAttributes: jsonb('custom_attributes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('contacts_tenant_id_idx').on(table.tenantId),
    index('contacts_tenant_id_phone_idx').on(table.tenantId, table.phone),
    index('contacts_tenant_id_username_idx').on(table.tenantId, table.username),
  ],
);

/**
 * Contact inbox - links a contact to a specific inbox with the channel-specific identifier
 */
export const contactInboxes = cloudSchema.table(
  'contact_inboxes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    inboxId: uuid('inbox_id')
      .notNull()
      .references(() => inboxes.id, { onDelete: 'cascade' }),
    sourceId: varchar('source_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('contact_inboxes_inbox_id_source_id_key').on(table.inboxId, table.sourceId),
    index('contact_inboxes_contact_id_idx').on(table.contactId),
  ],
);

/**
 * Conversation - a thread of messages between a contact and agents within a specific inbox
 */
export const conversations = cloudSchema.table(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    inboxId: uuid('inbox_id')
      .notNull()
      .references(() => inboxes.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    contactInboxId: uuid('contact_inbox_id')
      .notNull()
      .references(() => contactInboxes.id, { onDelete: 'cascade' }),
    assignedAgentId: uuid('assigned_agent_id').references(() => users.id, { onDelete: 'set null' }),
    status: conversationStatusEnum('status').notNull().default('OPEN'),
    unreadCount: integer('unread_count').notNull().default(0),
    lastMessageContent: text('last_message_content'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    lastMessageIsFromContact: boolean('last_message_is_from_contact'),
    labels: text('labels').array(),
    snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
    customAttributes: jsonb('custom_attributes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('conversations_tenant_id_status_idx').on(table.tenantId, table.status),
    index('conversations_inbox_id_idx').on(table.inboxId),
    index('conversations_contact_id_idx').on(table.contactId),
    index('conversations_assigned_agent_id_idx').on(table.assignedAgentId),
    index('conversations_tenant_id_updated_at_idx').on(table.tenantId, table.updatedAt),
  ],
);

/**
 * Message - an individual message within a conversation
 */
export const messages = cloudSchema.table(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    contentType: messageTypeEnum('content_type').notNull().default('TEXT'),
    senderType: messageSenderTypeEnum('sender_type').notNull(),
    senderId: uuid('sender_id').notNull(),
    senderName: varchar('sender_name', { length: 255 }).notNull(),
    status: messageStatusEnum('status').notNull().default('SENT'),
    isPrivate: boolean('is_private').notNull().default(false),
    echoId: varchar('echo_id', { length: 36 }),
    contentAttributes: jsonb('content_attributes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_conversation_id_created_at_idx').on(table.conversationId, table.createdAt),
    index('messages_conversation_id_idx').on(table.conversationId),
  ],
);

/**
 * Canned response - pre-defined message templates for quick agent replies
 */
export const cannedResponses = cloudSchema.table(
  'canned_responses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    shortCode: varchar('short_code', { length: 100 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('canned_responses_tenant_id_short_code_key').on(table.tenantId, table.shortCode),
  ],
);

// Type exports
export type Inbox = typeof inboxes.$inferSelect;
export type NewInbox = typeof inboxes.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type ContactInbox = typeof contactInboxes.$inferSelect;
export type NewContactInbox = typeof contactInboxes.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type CannedResponse = typeof cannedResponses.$inferSelect;
export type NewCannedResponse = typeof cannedResponses.$inferInsert;
