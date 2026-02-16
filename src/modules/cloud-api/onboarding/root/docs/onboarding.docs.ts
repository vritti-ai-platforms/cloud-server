import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SetPasswordDto } from '../dto/request/set-password.dto';

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

export function ApiStartOnboarding() {
  return applyDecorators(
    ApiOperation({ summary: 'Start or continue the onboarding process' }),
    ApiResponse({
      status: 200,
      description: 'Onboarding process started, returns current step and sends OTP if needed',
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
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Password set successfully' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid password format or validation failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}
