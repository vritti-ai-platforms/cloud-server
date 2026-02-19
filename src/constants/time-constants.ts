/**
 * Time-related constants for the application
 * Centralizes all hardcoded time values for easier maintenance
 */
export const TIME_CONSTANTS = {
  // Token expiry times
  ACCESS_TOKEN_EXPIRY_MINUTES: 15,
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  ONBOARDING_TOKEN_EXPIRY_DAYS: 7,

  // Verification expiry times
  OTP_EXPIRY_MINUTES: 5,
  MOBILE_VERIFICATION_EXPIRY_MINUTES: 10,

  // Attempt limits
  MAX_OTP_ATTEMPTS: 3,
  MAX_MOBILE_VERIFICATION_ATTEMPTS: 5,

  // MFA setup/verification TTLs
  TOTP_PENDING_SETUP_TTL_MINUTES: 10,
  PASSKEY_PENDING_SETUP_TTL_MINUTES: 5,
  PASSKEY_AUTH_CHALLENGE_TTL_MINUTES: 5,
  MFA_CHALLENGE_TTL_MINUTES: 5,

  // Security
  BCRYPT_SALT_ROUNDS: 10,
} as const;
