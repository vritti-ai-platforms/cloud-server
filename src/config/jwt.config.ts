import { JwtModuleOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Configuration Factory
 * Creates JWT module options using ConfigService
 * Used for both onboarding tokens and auth tokens
 */
export const jwtConfigFactory = (
  configService: ConfigService,
): JwtModuleOptions => ({
  secret: configService.getOrThrow<string>('JWT_SECRET'),
  signOptions: {
    issuer: 'vritti-api',
  },
});

/**
 * Token expiry string type compatible with ms library.
 * This is a subset of StringValue from 'ms' that covers common JWT expiry formats.
 */
type TokenExpiryString = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

/** Token expiry configuration object */
export interface TokenExpiry {
  ONBOARDING: TokenExpiryString;
  ACCESS: TokenExpiryString;
  REFRESH: TokenExpiryString;
  PASSWORD_RESET: TokenExpiryString;
}

/**
 * Get token expiry durations from environment variables.
 * Values from env must match TokenExpiryString format (e.g., '15m', '24h', '30d').
 */
export const getTokenExpiry = (configService: ConfigService): TokenExpiry => ({
  // Onboarding token: default 24 hours
  ONBOARDING: '24h',

  // Access token: from env, default 15 minutes
  ACCESS: (configService.get<string>('JWT_ACCESS_EXPIRY') ??
    '15m') as TokenExpiryString,

  // Refresh token: from env, default 30 days
  REFRESH: (configService.get<string>('JWT_REFRESH_EXPIRY') ??
    '30d') as TokenExpiryString,

  // Password reset token: default 15 minutes
  PASSWORD_RESET: '15m',
});

/**
 * Token types
 */
export enum TokenType {
  ONBOARDING = 'onboarding',
  ACCESS = 'access',
  REFRESH = 'refresh',
  PASSWORD_RESET = 'password_reset',
}

/**
 * Access token payload with refresh token binding
 */
export interface AccessTokenPayload {
  userId: string;
  type: TokenType.ACCESS;
  /** SHA-256 hash of bound refresh token */
  refreshTokenHash: string;
}

/**
 * Onboarding token payload with refresh token binding
 */
export interface OnboardingTokenPayload {
  userId: string;
  type: TokenType.ONBOARDING;
  /** SHA-256 hash of bound refresh token */
  refreshTokenHash: string;
}
