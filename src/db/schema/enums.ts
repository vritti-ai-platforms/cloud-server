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
export const sessionTypeEnum = cloudSchema.enum('SessionType', ['ONBOARDING', 'CLOUD', 'COMPANY']);

// Chat enums
export const channelTypeEnum = cloudSchema.enum('ChannelType', ['TELEGRAM', 'INSTAGRAM', 'WHATSAPP']);
export const inboxStatusEnum = cloudSchema.enum('InboxStatus', ['ACTIVE', 'PENDING', 'DISCONNECTED', 'ERROR']);
export const conversationStatusEnum = cloudSchema.enum('ConversationStatus', [
  'OPEN',
  'RESOLVED',
  'PENDING',
  'SNOOZED',
]);
export const messageTypeEnum = cloudSchema.enum('MessageType', ['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO']);
export const messageStatusEnum = cloudSchema.enum('MessageStatus', [
  'SENDING',
  'SENT',
  'DELIVERED',
  'READ',
  'FAILED',
]);
export const messageSenderTypeEnum = cloudSchema.enum('MessageSenderType', ['CONTACT', 'USER']);

// TypeScript type exports for use in DTOs and services
export type DatabaseType = (typeof databaseTypeEnum.enumValues)[number];
export type TenantStatus = (typeof tenantStatusEnum.enumValues)[number];
export type AccountStatus = (typeof accountStatusEnum.enumValues)[number];
export type OnboardingStep = (typeof onboardingStepEnum.enumValues)[number];
export type VerificationMethod = (typeof verificationMethodEnum.enumValues)[number];
export type TwoFactorMethod = (typeof twoFactorMethodEnum.enumValues)[number];
export type OAuthProviderType = (typeof oauthProviderTypeEnum.enumValues)[number];
export type SessionType = (typeof sessionTypeEnum.enumValues)[number];
export type ChannelType = (typeof channelTypeEnum.enumValues)[number];
export type InboxStatus = (typeof inboxStatusEnum.enumValues)[number];
export type ConversationStatus = (typeof conversationStatusEnum.enumValues)[number];
export type MessageType = (typeof messageTypeEnum.enumValues)[number];
export type MessageStatus = (typeof messageStatusEnum.enumValues)[number];
export type MessageSenderType = (typeof messageSenderTypeEnum.enumValues)[number];

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
  COMPANY: 'COMPANY' as const,
};

export const ChannelTypeValues = {
  TELEGRAM: 'TELEGRAM' as const,
  INSTAGRAM: 'INSTAGRAM' as const,
  WHATSAPP: 'WHATSAPP' as const,
};

export const InboxStatusValues = {
  ACTIVE: 'ACTIVE' as const,
  PENDING: 'PENDING' as const,
  DISCONNECTED: 'DISCONNECTED' as const,
  ERROR: 'ERROR' as const,
};

export const ConversationStatusValues = {
  OPEN: 'OPEN' as const,
  RESOLVED: 'RESOLVED' as const,
  PENDING: 'PENDING' as const,
  SNOOZED: 'SNOOZED' as const,
};

export const MessageTypeValues = {
  TEXT: 'TEXT' as const,
  IMAGE: 'IMAGE' as const,
  FILE: 'FILE' as const,
  AUDIO: 'AUDIO' as const,
  VIDEO: 'VIDEO' as const,
};

export const MessageStatusValues = {
  SENDING: 'SENDING' as const,
  SENT: 'SENT' as const,
  DELIVERED: 'DELIVERED' as const,
  READ: 'READ' as const,
  FAILED: 'FAILED' as const,
};

export const MessageSenderTypeValues = {
  CONTACT: 'CONTACT' as const,
  USER: 'USER' as const,
};
