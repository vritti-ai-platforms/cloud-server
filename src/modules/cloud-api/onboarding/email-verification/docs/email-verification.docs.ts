import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VerifyEmailDto } from '../dto/request/verify-email.dto';
import { ResendEmailOtpResponseDto } from '../dto/response/resend-email-otp-response.dto';
import { VerifyEmailResponseDto } from '../dto/response/verify-email-response.dto';

export function ApiSendEmailOtp() {
  return applyDecorators(
    ApiOperation({ summary: 'Send initial email verification OTP' }),
    ApiResponse({
      status: 200,
      description: 'Verification code sent to your email',
      type: ResendEmailOtpResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Email already verified' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

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

