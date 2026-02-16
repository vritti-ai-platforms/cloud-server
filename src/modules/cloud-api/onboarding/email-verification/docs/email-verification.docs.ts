import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VerifyEmailDto } from '../dto/request/verify-email.dto';
import { ResendEmailOtpResponseDto } from '../dto/response/resend-email-otp-response.dto';
import { VerifyEmailResponseDto } from '../dto/response/verify-email-response.dto';

export function ApiVerifyEmail() {
  return applyDecorators(
    ApiOperation({ summary: 'Verify email address using OTP' }),
    ApiBody({ type: VerifyEmailDto, description: 'Email verification OTP payload' }),
    ApiResponse({
      status: 200,
      description: 'Email verified successfully',
      type: VerifyEmailResponseDto,
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
      type: ResendEmailOtpResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 429, description: 'Too many requests - Rate limit exceeded' }),
  );
}
