import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BackupCodesResponseDto } from '../../totp/dto/response/backup-codes-response.dto';
import { VerifyPasskeyDto } from '../dto/request/verify-passkey.dto';
import { PasskeyRegistrationOptionsDto } from '../dto/response/passkey-registration-options.dto';

export function ApiInitiatePasskeySetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Initiate Passkey/WebAuthn setup' }),
    ApiResponse({ status: 200, description: 'Returns WebAuthn registration options for passkey setup', type: PasskeyRegistrationOptionsDto }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 400, description: '2FA already enabled for this user' }),
  );
}

export function ApiVerifyPasskeySetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify Passkey/WebAuthn credential registration' }),
    ApiBody({ type: VerifyPasskeyDto }),
    ApiResponse({ status: 200, description: 'Passkey registered successfully, returns backup codes', type: BackupCodesResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid passkey credential or session expired' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}
