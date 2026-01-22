import { boolean, index, integer, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { twoFactorMethodEnum, verificationMethodEnum } from './enums';
import { users } from './user';

/**
 * Email verification - tracks OTP for email verification
 */
export const emailVerifications = cloudSchema.table(
  'email_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    otp: varchar('otp', { length: 255 }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    isVerified: boolean('is_verified').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => [index('email_verifications_user_id_email_idx').on(table.userId, table.email)],
);

/**
 * Mobile verification - tracks OTP and QR verification for phone numbers
 */
export const mobileVerifications = cloudSchema.table(
  'mobile_verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Phone is nullable for QR-based methods where phone comes from webhook
    phone: varchar('phone', { length: 20 }),
    phoneCountry: varchar('phone_country', { length: 5 }),
    method: verificationMethodEnum('method').notNull(),
    otp: varchar('otp', { length: 255 }),
    attempts: integer('attempts').notNull().default(0),
    isVerified: boolean('is_verified').notNull().default(false),
    qrCode: text('qr_code'),
    qrScannedAt: timestamp('qr_scanned_at', { withTimezone: true }),
    qrVerificationId: varchar('qr_verification_id', { length: 255 }).unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => [
    index('mobile_verifications_user_id_phone_idx').on(table.userId, table.phone),
    index('mobile_verifications_qr_verification_id_idx').on(table.qrVerificationId),
  ],
);

/**
 * Two-factor authentication - stores 2FA settings
 */
export const twoFactorAuth = cloudSchema.table(
  'two_factor_auth',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    method: twoFactorMethodEnum('method').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    totpSecret: varchar('totp_secret', { length: 255 }),
    totpBackupCodes: text('totp_backup_codes'),
    passkeyCredentialId: varchar('passkey_credential_id', {
      length: 255,
    }).unique(),
    passkeyPublicKey: text('passkey_public_key'),
    passkeyCounter: integer('passkey_counter'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (table) => [index('two_factor_auth_user_id_method_idx').on(table.userId, table.method)],
);

// Type exports
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type NewEmailVerification = typeof emailVerifications.$inferInsert;
export type MobileVerification = typeof mobileVerifications.$inferSelect;
export type NewMobileVerification = typeof mobileVerifications.$inferInsert;
export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;
export type NewTwoFactorAuth = typeof twoFactorAuth.$inferInsert;
