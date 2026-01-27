import { index, integer, jsonb, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { chatMessageRoleEnum } from './enums';
import { users } from './user';

/**
 * Chat conversations - stores AI chat conversation metadata
 */
export const chatConversations = cloudSchema.table(
  'chat_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }),
    messageCount: integer('message_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('chat_conversations_user_id_idx').on(table.userId)],
);

/**
 * Chat messages - stores individual messages in conversations
 * Supports user messages, assistant responses, and tool execution results
 */
export const chatMessages = cloudSchema.table(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => chatConversations.id, { onDelete: 'cascade' }),
    role: chatMessageRoleEnum('role').notNull(),
    content: text('content'),

    // Tool call data (when assistant calls tools)
    toolCalls: jsonb('tool_calls'),

    // Tool result data (when role='tool')
    toolCallId: varchar('tool_call_id', { length: 255 }),
    toolName: varchar('tool_name', { length: 255 }),
    toolResult: jsonb('tool_result'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('chat_messages_conversation_id_idx').on(table.conversationId)],
);

// Type exports for TypeScript integration
export type ChatConversation = typeof chatConversations.$inferSelect;
export type NewChatConversation = typeof chatConversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
