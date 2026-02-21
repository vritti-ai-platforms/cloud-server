import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiProduces, ApiResponse } from '@nestjs/swagger';
import { InitiateMobileVerificationDto } from '../dto/request/initiate-mobile-verification.dto';
import { VerifyMobileOtpDto } from '../dto/request/verify-mobile-otp.dto';
import { MobileVerificationStatusResponseDto } from '../dto/response/mobile-verification-status-response.dto';

export function ApiInitiateManualMobileVerification() {
  return applyDecorators(
    ApiOperation({
      summary: 'Initiate manual OTP mobile verification',
      description: 'Sends an OTP via SMS to the provided phone number for manual entry. Use the SSE endpoints for QR-based WhatsApp or SMS verification.',
    }),
    ApiBody({ type: InitiateMobileVerificationDto, description: 'Mobile verification initiation payload' }),
    ApiResponse({
      status: 200,
      description: 'Manual OTP verification initiated successfully',
      type: MobileVerificationStatusResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid phone number or verification method' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiSubscribeWhatsApp() {
  return applyDecorators(
    ApiOperation({
      summary: 'Initiate WhatsApp QR verification and subscribe to events',
      description: `SSE endpoint that initiates WhatsApp verification and immediately streams status updates.
The first event is type "initiated" containing the verification code and WhatsApp number.
Subsequent events are pushed when the user sends the code via WhatsApp.`,
    }),
    ApiProduces('text/event-stream'),
    ApiResponse({
      status: 200,
      description: 'SSE stream established. First event is "initiated", followed by status updates.',
    }),
    ApiResponse({ status: 400, description: 'Phone number already verified' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
  );
}

export function ApiSubscribeSms() {
  return applyDecorators(
    ApiOperation({
      summary: 'Initiate SMS QR verification and subscribe to events',
      description: `SSE endpoint that initiates SMS QR verification and immediately streams status updates.
The first event is type "initiated" containing the verification code to send via SMS.
Subsequent events are pushed when the user sends the code via SMS.`,
    }),
    ApiProduces('text/event-stream'),
    ApiResponse({
      status: 200,
      description: 'SSE stream established. First event is "initiated", followed by status updates.',
    }),
    ApiResponse({ status: 400, description: 'Phone number already verified' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' }),
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
