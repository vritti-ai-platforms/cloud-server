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

export const mfaMethodEnum = cloudSchema.enum('MfaMethod', ['TOTP', 'PASSKEY']);

// OAuth enums
export const oauthProviderTypeEnum = cloudSchema.enum('OAuthProviderType', [
  'GOOGLE',
  'MICROSOFT',
  'APPLE',
  'FACEBOOK',
  'X',
]);

// Signup method enum
export const signupMethodEnum = cloudSchema.enum('SignupMethod', ['email', 'oauth']);

// Session enums
export const sessionTypeEnum = cloudSchema.enum('SessionType', ['ONBOARDING', 'CLOUD', 'COMPANY', 'RESET']);

// TypeScript type exports for use in DTOs and services
export type DatabaseType = (typeof databaseTypeEnum.enumValues)[number];
export type TenantStatus = (typeof tenantStatusEnum.enumValues)[number];
export type AccountStatus = (typeof accountStatusEnum.enumValues)[number];
export type OnboardingStep = (typeof onboardingStepEnum.enumValues)[number];
export type VerificationChannel = (typeof verificationChannelEnum.enumValues)[number];
export type MfaMethod = (typeof mfaMethodEnum.enumValues)[number];
export type OAuthProviderType = (typeof oauthProviderTypeEnum.enumValues)[number];
export type SignupMethod = (typeof signupMethodEnum.enumValues)[number];
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

export const MfaMethodValues = {
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

export const SignupMethodValues = {
  EMAIL: 'email' as const,
  OAUTH: 'oauth' as const,
};

export const SessionTypeValues = {
  ONBOARDING: 'ONBOARDING' as const,
  CLOUD: 'CLOUD' as const,
  COMPANY: 'COMPANY' as const,
  RESET: 'RESET' as const,
};

// Organization enums
export const orgPlanEnum = cloudSchema.enum('OrgPlan', ['free', 'pro', 'enterprise']);
export type OrgPlan = (typeof orgPlanEnum.enumValues)[number];
export const OrgPlanValues = { free: 'free' as const, pro: 'pro' as const, enterprise: 'enterprise' as const };

export const orgSizeEnum = cloudSchema.enum('OrgSize', ['0-10', '10-20', '20-50', '50-100', '100-500', '500+']);
export type OrgSize = (typeof orgSizeEnum.enumValues)[number];
export const OrgSizeValues = { s0_10: '0-10' as const, s10_20: '10-20' as const, s20_50: '20-50' as const, s50_100: '50-100' as const, s100_500: '100-500' as const, s500plus: '500+' as const };

export const orgMemberRoleEnum = cloudSchema.enum('OrgMemberRole', ['Owner', 'Admin']);
export type OrgMemberRole = (typeof orgMemberRoleEnum.enumValues)[number];
export const OrgMemberRoleValues = { Owner: 'Owner' as const, Admin: 'Admin' as const };
