import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MfaStatusResponseDto } from '../../totp/dto/response/mfa-status-response.dto';

export function ApiSkipMfaSetup() {
  return applyDecorators(
    ApiOperation({ summary: 'Skip MFA setup' }),
    ApiResponse({ status: 200, description: 'MFA setup skipped successfully' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiGetMfaStatus() {
  return applyDecorators(
    ApiOperation({ summary: 'Get current MFA status' }),
    ApiResponse({ status: 200, description: 'Returns the current MFA configuration status', type: MfaStatusResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}
