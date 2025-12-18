import { cloudSchema } from './cloud-schema';

// Tenant-related enums
export const databaseTypeEnum = cloudSchema.enum('DatabaseType', ['SHARED', 'DEDICATED']);
export const tenantStatusEnum = cloudSchema.enum('TenantStatus', [
  'ACTIVE',
  'SUSPENDED',
  'ARCHIVED',
]);

// User account enums
export const accountStatusEnum = cloudSchema.enum('AccountStatus', [
  'PENDING_VERIFICATION',
  'PENDING_MOBILE',
  'ACTIVE',
  'SUSPENDED',
  'DEACTIVATED',
]);

export const onboardingStepEnum = cloudSchema.enum('OnboardingStep', [
  'EMAIL_VERIFICATION',
  'SET_PASSWORD',
  'MOBILE_VERIFICATION',
  'TWO_FACTOR_SETUP',
  'COMPLETE',
]);

// Verification enums
export const verificationMethodEnum = cloudSchema.enum('VerificationMethod', [
  'WHATSAPP_QR',
  'SMS_QR',
  'MANUAL_OTP',
]);

export const twoFactorMethodEnum = cloudSchema.enum('TwoFactorMethod', [
  'TOTP',
  'PASSKEY',
]);

// OAuth enums
export const oauthProviderTypeEnum = cloudSchema.enum('OAuthProviderType', [
  'GOOGLE',
  'MICROSOFT',
  'APPLE',
  'FACEBOOK',
  'X',
]);

// Session enums
export const sessionTypeEnum = cloudSchema.enum('SessionType', ['ONBOARDING', 'CLOUD']);

// TypeScript type exports for use in DTOs and services
export type DatabaseType = (typeof databaseTypeEnum.enumValues)[number];
export type TenantStatus = (typeof tenantStatusEnum.enumValues)[number];
export type AccountStatus = (typeof accountStatusEnum.enumValues)[number];
export type OnboardingStep = (typeof onboardingStepEnum.enumValues)[number];
export type VerificationMethod =
  (typeof verificationMethodEnum.enumValues)[number];
export type TwoFactorMethod = (typeof twoFactorMethodEnum.enumValues)[number];
export type OAuthProviderType =
  (typeof oauthProviderTypeEnum.enumValues)[number];
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
  PENDING_MOBILE: 'PENDING_MOBILE' as const,
  ACTIVE: 'ACTIVE' as const,
  SUSPENDED: 'SUSPENDED' as const,
  DEACTIVATED: 'DEACTIVATED' as const,
};

export const OnboardingStepValues = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION' as const,
  SET_PASSWORD: 'SET_PASSWORD' as const,
  MOBILE_VERIFICATION: 'MOBILE_VERIFICATION' as const,
  TWO_FACTOR_SETUP: 'TWO_FACTOR_SETUP' as const,
  COMPLETE: 'COMPLETE' as const,
};

export const VerificationMethodValues = {
  WHATSAPP_QR: 'WHATSAPP_QR' as const,
  SMS_QR: 'SMS_QR' as const,
  MANUAL_OTP: 'MANUAL_OTP' as const,
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
};
