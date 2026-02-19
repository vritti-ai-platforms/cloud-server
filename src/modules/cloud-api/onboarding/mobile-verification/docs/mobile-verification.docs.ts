import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InitiateMobileVerificationDto } from '../dto/request/initiate-mobile-verification.dto';
import { VerifyMobileOtpDto } from '../dto/request/verify-mobile-otp.dto';
import { MobileVerificationStatusResponseDto } from '../dto/response/mobile-verification-status-response.dto';

export function ApiInitiateMobileVerification() {
  return applyDecorators(
    ApiOperation({ summary: 'Initiate mobile phone verification' }),
    ApiBody({ type: InitiateMobileVerificationDto, description: 'Mobile verification initiation payload' }),
    ApiResponse({
      status: 200,
      description: 'Mobile verification initiated successfully',
      type: MobileVerificationStatusResponseDto,
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
      type: MobileVerificationStatusResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
    ApiResponse({ status: 404, description: 'No active mobile verification found' }),
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
