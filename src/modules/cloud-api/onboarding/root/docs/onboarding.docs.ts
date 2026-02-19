import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SetPasswordDto } from '../dto/request/set-password.dto';
import { StartOnboardingResponseDto } from '../dto/response/start-onboarding-response.dto';

export function ApiGetStatus() {
  return applyDecorators(
    ApiOperation({ summary: 'Get current onboarding status' }),
    ApiResponse({
      status: 200,
      description: 'Returns the current onboarding status for the user',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiSetPassword() {
  return applyDecorators(
    ApiOperation({ summary: 'Set password for OAuth users' }),
    ApiBody({ type: SetPasswordDto, description: 'New password payload' }),
    ApiResponse({
      status: 200,
      description: 'Password set successfully',
      type: StartOnboardingResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid password format or validation failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}
