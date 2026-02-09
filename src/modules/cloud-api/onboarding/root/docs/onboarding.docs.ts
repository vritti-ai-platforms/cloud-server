import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InitiateMobileVerificationDto } from '../../mobile-verification/dto/initiate-mobile-verification.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { VerifyMobileOtpDto } from '../../mobile-verification/dto/verify-mobile-otp.dto';

export function ApiVerifyEmail() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify email address using OTP' }),
    ApiBody({ type: VerifyEmailDto, description: 'Email verification OTP payload' }),
    ApiResponse({
      status: 200,
      description: 'Email verified successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Email verified successfully' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid or expired OTP' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiResendEmailOtp() {
  return applyDecorators(
    ApiOperation({ summary: 'Resend email verification OTP' }),
    ApiResponse({
      status: 200,
      description: 'OTP sent successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'OTP sent successfully' },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 429, description: 'Too many requests - Rate limit exceeded' }),
  );
}

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

export function ApiInitiateMobileVerification() {
  return applyDecorators(
    ApiOperation({ summary: 'Initiate mobile phone verification' }),
    ApiBody({ type: InitiateMobileVerificationDto, description: 'Mobile verification initiation payload' }),
    ApiResponse({
      status: 200,
      description: 'Mobile verification initiated successfully',
    }),
    ApiResponse({ status: 400, description: 'Invalid phone number or verification method' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiGetMobileVerificationStatus() {
  return applyDecorators(
    ApiOperation({ summary: 'Get current mobile verification status' }),
    ApiResponse({
      status: 200,
      description: 'Returns the current mobile verification status',
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 404, description: 'No active mobile verification found' }),
  );
}

export function ApiResendMobileVerification() {
  return applyDecorators(
    ApiOperation({ summary: 'Resend mobile verification code' }),
    ApiBody({ type: InitiateMobileVerificationDto, description: 'Mobile verification resend payload' }),
    ApiResponse({
      status: 200,
      description: 'Mobile verification code resent successfully',
    }),
    ApiResponse({ status: 400, description: 'Invalid phone number or verification method' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 429, description: 'Too many requests - Rate limit exceeded' }),
  );
}

export function ApiVerifyMobileOtp() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify mobile phone number using OTP' }),
    ApiBody({ type: VerifyMobileOtpDto, description: 'Mobile OTP verification payload' }),
    ApiResponse({
      status: 200,
      description: 'Phone number verified successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Phone number verified successfully' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid or expired OTP' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}
