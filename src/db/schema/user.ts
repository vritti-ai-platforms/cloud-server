import { boolean, text, timestamp, uuid, varchar } from '@vritti/api-sdk/drizzle-pg-core';
import { cloudSchema } from './cloud-schema';
import { accountStatusEnum, onboardingStepEnum } from './enums';

/**
 * User account - core user entity
 */
export const users = cloudSchema.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  accountStatus: accountStatusEnum('account_status').notNull().default('PENDING_VERIFICATION'),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  onboardingStep: onboardingStepEnum('onboarding_step').notNull().default('EMAIL_VERIFICATION'),
  phone: varchar('phone', { length: 20 }),
  phoneCountry: varchar('phone_country', { length: 5 }),
  profilePictureUrl: text('profile_picture_url'),
  locale: varchar('locale', { length: 10 }).notNull().default('en'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
