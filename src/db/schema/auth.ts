import { boolean, index, text, timestamp, unique, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { oauthProviderTypeEnum, sessionTypeEnum } from './enums';
import { users } from './user';

/**
 * Session - tracks active user sessions with access and refresh tokens
 */
export const sessions = cloudSchema.table(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: sessionTypeEnum('type').notNull().default('CLOUD'),
    accessToken: varchar('access_token', { length: 2048 }).notNull().unique(),
    refreshToken: varchar('refresh_token', { length: 2048 }).unique(),
    tokenType: varchar('token_type', { length: 50 }).notNull().default('Bearer'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    isActive: boolean('is_active').notNull().default(true),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
    }).notNull(),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('sessions_user_id_active_idx').on(table.userId, table.isActive),
    index('sessions_access_token_idx').on(table.accessToken),
    index('sessions_refresh_token_idx').on(table.refreshToken),
  ],
);

/**
 * OAuth provider - links external OAuth providers to user accounts
 */
export const oauthProviders = cloudSchema.table(
  'oauth_providers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderTypeEnum('provider').notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    displayName: varchar('display_name', { length: 255 }),
    profilePictureUrl: text('profile_picture_url'),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('oauth_providers_provider_provider_id_key').on(table.provider, table.providerId),
    index('oauth_providers_user_id_provider_idx').on(table.userId, table.provider),
  ],
);

/**
 * OAuth state tokens - for CSRF protection in OAuth flows
 */
export const oauthStates = cloudSchema.table(
  'oauth_states',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stateToken: varchar('state_token', { length: 512 }).notNull().unique(),
    provider: oauthProviderTypeEnum('provider').notNull(),
    userId: uuid('user_id'),
    codeVerifier: varchar('code_verifier', { length: 255 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('oauth_states_state_token_idx').on(table.stateToken),
    index('oauth_states_expires_at_idx').on(table.expiresAt),
  ],
);

// Type exports
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type OAuthProvider = typeof oauthProviders.$inferSelect;
export type NewOAuthProvider = typeof oauthProviders.$inferInsert;
export type OAuthState = typeof oauthStates.$inferSelect;
export type NewOAuthState = typeof oauthStates.$inferInsert;
