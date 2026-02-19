import { cloudSchema } from './cloud-schema';

// Tenant-related enums
export const databaseTypeEnum = cloudSchema.enum('DatabaseType', ['SHARED', 'DEDICATED']);
export const tenantStatusEnum = cloudSchema.enum('TenantStatus', ['ACTIVE', 'SUSPENDED', 'ARCHIVED']);

// User account enums
export const accountStatusEnum = cloudSchema.enum('AccountStatus', [
  'PENDING_VERIFICATION',
  'ACTIVE',
  'INACTIVE',
]);

export const onboardingStepEnum = cloudSchema.enum('OnboardingStep', [
  'EMAIL_VERIFICATION',
  'SET_PASSWORD',
  'MOBILE_VERIFICATION',
  'TWO_FACTOR_SETUP',
  'COMPLETE',
]);

// Verification enums
export const verificationChannelEnum = cloudSchema.enum('verification_channel', [
  'EMAIL',        // Outbound email with OTP
  'SMS_OUT',      // Outbound SMS with OTP (we send to user)
  'SMS_IN',       // Inbound SMS with code (user sends to us via QR)
  'WHATSAPP_IN',  // Inbound WhatsApp with code (user sends to us via QR)
]);

export const twoFactorMethodEnum = cloudSchema.enum('TwoFactorMethod', ['TOTP', 'PASSKEY']);

// OAuth enums
export const oauthProviderTypeEnum = cloudSchema.enum('OAuthProviderType', [
  'GOOGLE',
  'MICROSOFT',
  'APPLE',
  'FACEBOOK',
  'X',
]);

// Session enums
export const sessionTypeEnum = cloudSchema.enum('SessionType', ['ONBOARDING', 'CLOUD', 'COMPANY']);

// TypeScript type exports for use in DTOs and services
export type DatabaseType = (typeof databaseTypeEnum.enumValues)[number];
export type TenantStatus = (typeof tenantStatusEnum.enumValues)[number];
export type AccountStatus = (typeof accountStatusEnum.enumValues)[number];
export type OnboardingStep = (typeof onboardingStepEnum.enumValues)[number];
export type VerificationChannel = (typeof verificationChannelEnum.enumValues)[number];
export type TwoFactorMethod = (typeof twoFactorMethodEnum.enumValues)[number];
export type OAuthProviderType = (typeof oauthProviderTypeEnum.enumValues)[number];
export type SessionType = (typeof sessionTypeEnum.enumValues)[number];

// Runtime enum value objects for use in code
export const DatabaseTypeValues = {
  SHARED: 'SHARED' as const,
  DEDICATED: 'DEDICATED' as const,
};

export const TenantStatusValues = {
  ACTIVE: 'ACTIVE' as const,
  SUSPENDED: 'SUSPENDED' as const,
  ARCHIVED: 'ARCHIVED' as const,
};

export const AccountStatusValues = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION' as const,
  ACTIVE: 'ACTIVE' as const,
  INACTIVE: 'INACTIVE' as const,
};

export const OnboardingStepValues = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION' as const,
  SET_PASSWORD: 'SET_PASSWORD' as const,
  MOBILE_VERIFICATION: 'MOBILE_VERIFICATION' as const,
  TWO_FACTOR_SETUP: 'TWO_FACTOR_SETUP' as const,
  COMPLETE: 'COMPLETE' as const,
};

export const VerificationChannelValues = {
  EMAIL: 'EMAIL' as const,
  SMS_OUT: 'SMS_OUT' as const,
  SMS_IN: 'SMS_IN' as const,
  WHATSAPP_IN: 'WHATSAPP_IN' as const,
};

export const TwoFactorMethodValues = {
  TOTP: 'TOTP' as const,
  PASSKEY: 'PASSKEY' as const,
};

export const OAuthProviderTypeValues = {
  GOOGLE: 'GOOGLE' as const,
  MICROSOFT: 'MICROSOFT' as const,
  APPLE: 'APPLE' as const,
  FACEBOOK: 'FACEBOOK' as const,
  X: 'X' as const,
};

export const SessionTypeValues = {
  ONBOARDING: 'ONBOARDING' as const,
  CLOUD: 'CLOUD' as const,
  COMPANY: 'COMPANY' as const,
};
