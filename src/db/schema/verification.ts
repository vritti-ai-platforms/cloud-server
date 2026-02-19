import { boolean, index, integer, text, timestamp, uniqueIndex, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { mfaMethodEnum, verificationChannelEnum } from './enums';
import { users } from './user';

// Unified verification — handles both OTP (outbound) and QR (inbound) verification flows
export const verifications = cloudSchema.table(
  'verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    channel: verificationChannelEnum('channel').notNull(),
    target: varchar('target', { length: 255 }), // Nullable for inbound channels (populated by webhook)

    // Two storage approaches - use one based on channel direction
    hashedOtp: varchar('hashed_otp', { length: 255 }), // For EMAIL, SMS_OUT (outbound OTP)
    verificationId: varchar('verification_id', { length: 255 }).unique(), // For SMS_IN, WHATSAPP_IN (inbound QR)

    attempts: integer('attempts').notNull().default(0),
    isVerified: boolean('is_verified').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => [
    index('verifications_user_id_idx').on(table.userId),
    index('verifications_user_id_channel_target_idx').on(table.userId, table.channel, table.target),
    index('verifications_verification_id_idx').on(table.verificationId),
    uniqueIndex('verifications_user_id_channel_unique').on(table.userId, table.channel),
  ],
);;

// MFA authentication — stores MFA settings (TOTP, Passkey)
export const mfaAuth = cloudSchema.table(
  'mfa_auth',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    method: mfaMethodEnum('method').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    totpSecret: varchar('totp_secret', { length: 255 }),
    totpBackupCodes: text('totp_backup_codes'),
    passkeyCredentialId: varchar('passkey_credential_id', {
      length: 255,
    }).unique(),
    passkeyPublicKey: text('passkey_public_key'),
    passkeyCounter: integer('passkey_counter'),
    passkeyTransports: varchar('passkey_transports', { length: 255 }), // JSON array: ["internal","hybrid"]
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [index('mfa_auth_user_id_method_idx').on(table.userId, table.method)],
);

// Password resets — tracks forgot password flow with linked verification
export const passwordResets = cloudSchema.table(
  'password_resets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    verificationId: uuid('verification_id').references(() => verifications.id, { onDelete: 'set null' }),
    resetToken: varchar('reset_token', { length: 255 }),
    isUsed: boolean('is_used').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (table) => [index('password_resets_user_id_email_idx').on(table.userId, table.email)],
);

// Email change requests — tracks email change workflow
export const emailChangeRequests = cloudSchema.table(
  'email_change_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    oldEmail: varchar('old_email', { length: 255 }).notNull(),
    newEmail: varchar('new_email', { length: 255 }),
    identityVerificationId: uuid('identity_verification_id').references(() => verifications.id, {
      onDelete: 'set null',
    }),
    newEmailVerificationId: uuid('new_email_verification_id').references(() => verifications.id, {
      onDelete: 'set null',
    }),
    isCompleted: boolean('is_completed').notNull().default(false),
    revertToken: uuid('revert_token'),
    revertExpiresAt: timestamp('revert_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    revertedAt: timestamp('reverted_at', { withTimezone: true }),
  },
  (table) => [index('email_change_requests_user_id_idx').on(table.userId)],
);

// Phone change requests — tracks phone change workflow
export const phoneChangeRequests = cloudSchema.table(
  'phone_change_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    oldPhone: varchar('old_phone', { length: 20 }).notNull(),
    oldPhoneCountry: varchar('old_phone_country', { length: 5 }),
    newPhone: varchar('new_phone', { length: 20 }),
    newPhoneCountry: varchar('new_phone_country', { length: 5 }),
    identityVerificationId: uuid('identity_verification_id').references(() => verifications.id, {
      onDelete: 'set null',
    }),
    newPhoneVerificationId: uuid('new_phone_verification_id').references(() => verifications.id, {
      onDelete: 'set null',
    }),
    isCompleted: boolean('is_completed').notNull().default(false),
    revertToken: uuid('revert_token'),
    revertExpiresAt: timestamp('revert_expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    revertedAt: timestamp('reverted_at', { withTimezone: true }),
  },
  (table) => [index('phone_change_requests_user_id_idx').on(table.userId)],
);

// Change request rate limits — tracks daily rate limits for email/phone changes
export const changeRequestRateLimits = cloudSchema.table(
  'change_request_rate_limits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    changeType: varchar('change_type', { length: 10 }).notNull(), // 'email' or 'phone'
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD format
    requestCount: integer('request_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('change_request_rate_limits_user_id_idx').on(table.userId),
    index('change_request_rate_limits_user_type_date_idx').on(table.userId, table.changeType, table.date),
  ],
);

// Type exports
export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
export type MfaAuth = typeof mfaAuth.$inferSelect;
export type NewMfaAuth = typeof mfaAuth.$inferInsert;
export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;
export type EmailChangeRequest = typeof emailChangeRequests.$inferSelect;
export type NewEmailChangeRequest = typeof emailChangeRequests.$inferInsert;
export type PhoneChangeRequest = typeof phoneChangeRequests.$inferSelect;
export type NewPhoneChangeRequest = typeof phoneChangeRequests.$inferInsert;
export type ChangeRequestRateLimit = typeof changeRequestRateLimits.$inferSelect;
export type NewChangeRequestRateLimit = typeof changeRequestRateLimits.$inferInsert;
