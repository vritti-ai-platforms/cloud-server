import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VerifyPasskeyDto } from '../dto/verify-passkey.dto';
import { VerifyTotpDto } from '../dto/verify-totp.dto';

export function ApiInitiateTotpSetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Initiate TOTP (Time-based One-Time Password) setup' }),
    ApiResponse({
      status: 200,
      description: 'Returns QR code and manual key for TOTP setup',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 409, description: 'TOTP already configured for this user' }),
  );
}

export function ApiVerifyTotpSetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify TOTP setup with a code from authenticator app' }),
    ApiBody({ type: VerifyTotpDto, description: 'TOTP verification payload' }),
    ApiResponse({
      status: 200,
      description: 'TOTP verified successfully, returns backup codes',
    }),
    ApiResponse({ status: 400, description: 'Invalid TOTP code' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiSkip2FASetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Skip two-factor authentication setup' }),
    ApiResponse({
      status: 200,
      description: '2FA setup skipped successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Two-factor authentication setup skipped. You can enable it later in settings.' },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiGet2FAStatus() {
  return applyDecorators(
    ApiOperation({ summary: 'Get current two-factor authentication status' }),
    ApiResponse({
      status: 200,
      description: 'Returns the current 2FA configuration status',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiInitiatePasskeySetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Initiate Passkey/WebAuthn setup' }),
    ApiResponse({
      status: 200,
      description: 'Returns WebAuthn registration options for passkey setup',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 409, description: 'Passkey already configured for this user' }),
  );
}

export function ApiVerifyPasskeySetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify Passkey/WebAuthn credential registration' }),
    ApiBody({ type: VerifyPasskeyDto, description: 'Passkey credential verification payload' }),
    ApiResponse({
      status: 200,
      description: 'Passkey registered successfully, returns backup codes',
    }),
    ApiResponse({ status: 400, description: 'Invalid passkey credential' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}
