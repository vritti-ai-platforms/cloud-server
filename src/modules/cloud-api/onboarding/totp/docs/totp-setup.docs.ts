import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VerifyTotpDto } from '../dto/request/verify-totp.dto';
import { BackupCodesResponseDto } from '../dto/response/backup-codes-response.dto';
import { TotpSetupResponseDto } from '../dto/response/totp-setup-response.dto';

export function ApiInitiateTotpSetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Initiate TOTP (Time-based One-Time Password) setup' }),
    ApiResponse({ status: 200, description: 'Returns QR code and manual key for TOTP setup', type: TotpSetupResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 400, description: 'MFA already enabled for this user' }),
  );
}

export function ApiVerifyTotpSetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify TOTP setup with a code from authenticator app' }),
    ApiBody({ type: VerifyTotpDto }),
    ApiResponse({ status: 200, description: 'TOTP verified successfully, returns backup codes', type: BackupCodesResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid TOTP code or session expired' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}
