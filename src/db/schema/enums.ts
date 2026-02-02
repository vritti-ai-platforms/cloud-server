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
export const verificationMethodEnum = cloudSchema.enum('VerificationMethod', [
  'WHATSAPP_QR',   // User sends token to WhatsApp via QR code
  'SMS_QR',        // User sends token via SMS via QR code
  'MANUAL_OTP',    // User enters OTP received via SMS
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
export const sessionTypeEnum = cloudSchema.enum('SessionType', ['ONBOARDING', 'CLOUD']);

// Chat enums
export const chatMessageRoleEnum = cloudSchema.enum('ChatMessageRole', ['user', 'assistant', 'tool']);

// Company enums
export const industryTypeEnum = cloudSchema.enum('IndustryType', [
  'Healthcare',
  'Retail',
  'F&B',
  'Professional Services',
  'Manufacturing',
  'Education',
  'Technology',
  'Other',
]);

export const companySizeEnum = cloudSchema.enum('CompanySize', [
  '1-10',
  '11-50',
  '51-200',
  '200+',
]);

export const databaseHealthEnum = cloudSchema.enum('DatabaseHealth', ['HEALTHY', 'DEGRADED', 'DOWN']);

export const databaseRegionEnum = cloudSchema.enum('DatabaseRegion', [
  'AP_SOUTH_1',
  'AP_SOUTHEAST_1',
  'EU_CENTRAL_1',
  'US_EAST_1',
]);

export const membershipStatusEnum = cloudSchema.enum('MembershipStatus', ['ACTIVE', 'SUSPENDED', 'REMOVED']);

export const businessUnitStatusEnum = cloudSchema.enum('BusinessUnitStatus', ['ACTIVE', 'INACTIVE', 'ARCHIVED']);

// App enums
export const appStatusEnum = cloudSchema.enum('AppStatus', ['ACTIVE', 'SUSPENDED', 'TRIAL', 'DISABLED']);
export const pricingTypeEnum = cloudSchema.enum('PricingType', ['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']);
export const appCategoryEnum = cloudSchema.enum('AppCategory', [
  'SALES',
  'FINANCE',
  'OPERATIONS',
  'COMMUNICATION',
  'ANALYTICS',
  'HR',
]);

// Business unit type
export const businessUnitTypeEnum = cloudSchema.enum('BusinessUnitType', [
  'OUTLET',
  'CLINIC',
  'WAREHOUSE',
  'HUB',
  'HQ',
  'OFFICE',
  'OTHER',
]);

// Invitation status
export const invitationStatusEnum = cloudSchema.enum('InvitationStatus', [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'REVOKED',
]);


// TypeScript type exports for use in DTOs and services
export type DatabaseType = (typeof databaseTypeEnum.enumValues)[number];
export type TenantStatus = (typeof tenantStatusEnum.enumValues)[number];
export type AccountStatus = (typeof accountStatusEnum.enumValues)[number];
export type OnboardingStep = (typeof onboardingStepEnum.enumValues)[number];
export type VerificationMethod = (typeof verificationMethodEnum.enumValues)[number];
export type TwoFactorMethod = (typeof twoFactorMethodEnum.enumValues)[number];
export type OAuthProviderType = (typeof oauthProviderTypeEnum.enumValues)[number];
export type SessionType = (typeof sessionTypeEnum.enumValues)[number];
export type ChatMessageRole = (typeof chatMessageRoleEnum.enumValues)[number];
export type IndustryType = (typeof industryTypeEnum.enumValues)[number];
export type CompanySize = (typeof companySizeEnum.enumValues)[number];
export type DatabaseHealth = (typeof databaseHealthEnum.enumValues)[number];
export type DatabaseRegion = (typeof databaseRegionEnum.enumValues)[number];
export type MembershipStatus = (typeof membershipStatusEnum.enumValues)[number];
export type BusinessUnitStatus = (typeof businessUnitStatusEnum.enumValues)[number];
export type AppStatus = (typeof appStatusEnum.enumValues)[number];
export type PricingType = (typeof pricingTypeEnum.enumValues)[number];
export type AppCategory = (typeof appCategoryEnum.enumValues)[number];
export type BusinessUnitType = (typeof businessUnitTypeEnum.enumValues)[number];
export type InvitationStatus = (typeof invitationStatusEnum.enumValues)[number];

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

export const ChatMessageRoleValues = {
  USER: 'user' as const,
  ASSISTANT: 'assistant' as const,
  TOOL: 'tool' as const,
};

export const IndustryTypeValues = {
  HEALTHCARE: 'Healthcare' as const,
  RETAIL: 'Retail' as const,
  F_AND_B: 'F&B' as const,
  PROFESSIONAL_SERVICES: 'Professional Services' as const,
  MANUFACTURING: 'Manufacturing' as const,
  EDUCATION: 'Education' as const,
  TECHNOLOGY: 'Technology' as const,
  OTHER: 'Other' as const,
};

export const CompanySizeValues = {
  SIZE_1_10: '1-10' as const,
  SIZE_11_50: '11-50' as const,
  SIZE_51_200: '51-200' as const,
  SIZE_200_PLUS: '200+' as const,
};

export const DatabaseHealthValues = {
  HEALTHY: 'HEALTHY' as const,
  DEGRADED: 'DEGRADED' as const,
  DOWN: 'DOWN' as const,
};

export const DatabaseRegionValues = {
  AP_SOUTH_1: 'AP_SOUTH_1' as const,
  AP_SOUTHEAST_1: 'AP_SOUTHEAST_1' as const,
  EU_CENTRAL_1: 'EU_CENTRAL_1' as const,
  US_EAST_1: 'US_EAST_1' as const,
};

export const MembershipStatusValues = {
  ACTIVE: 'ACTIVE' as const,
  SUSPENDED: 'SUSPENDED' as const,
  REMOVED: 'REMOVED' as const,
};

export const BusinessUnitStatusValues = {
  ACTIVE: 'ACTIVE' as const,
  INACTIVE: 'INACTIVE' as const,
  ARCHIVED: 'ARCHIVED' as const,
};

export const AppStatusValues = {
  ACTIVE: 'ACTIVE' as const,
  SUSPENDED: 'SUSPENDED' as const,
  TRIAL: 'TRIAL' as const,
  DISABLED: 'DISABLED' as const,
};

export const PricingTypeValues = {
  FREE: 'FREE' as const,
  BASIC: 'BASIC' as const,
  PREMIUM: 'PREMIUM' as const,
  ENTERPRISE: 'ENTERPRISE' as const,
};

export const AppCategoryValues = {
  SALES: 'SALES' as const,
  FINANCE: 'FINANCE' as const,
  OPERATIONS: 'OPERATIONS' as const,
  COMMUNICATION: 'COMMUNICATION' as const,
  ANALYTICS: 'ANALYTICS' as const,
  HR: 'HR' as const,
};

export const BusinessUnitTypeValues = {
  OUTLET: 'OUTLET' as const,
  CLINIC: 'CLINIC' as const,
  WAREHOUSE: 'WAREHOUSE' as const,
  HUB: 'HUB' as const,
  HQ: 'HQ' as const,
  OFFICE: 'OFFICE' as const,
  OTHER: 'OTHER' as const,
};

export const InvitationStatusValues = {
  PENDING: 'PENDING' as const,
  ACCEPTED: 'ACCEPTED' as const,
  DECLINED: 'DECLINED' as const,
  EXPIRED: 'EXPIRED' as const,
  REVOKED: 'REVOKED' as const,
};
