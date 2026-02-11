import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function ApiRequestEmailIdentityVerification() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request identity verification for email change',
      description: 'Sends a 6-digit OTP to the current email address to verify user identity before allowing email change',
    }),
    ApiResponse({
      status: 200,
      description: 'OTP sent successfully',
      schema: {
        type: 'object',
        properties: {
          verificationId: { type: 'string', format: 'uuid' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Email not verified or other validation error' }),
  );
}

export function ApiVerifyEmailIdentity() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify identity for email change',
      description:
        'Verifies the OTP sent to current email and creates an email change request. Checks daily rate limit (max 3 per day)',
    }),
    ApiResponse({
      status: 200,
      description: 'Identity verified, change request created',
      schema: {
        type: 'object',
        properties: {
          changeRequestId: { type: 'string', format: 'uuid' },
          changeRequestsToday: { type: 'number' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid OTP or rate limit exceeded' }),
    ApiResponse({ status: 401, description: 'Incorrect verification code' }),
  );
}

export function ApiSubmitNewEmail() {
  return applyDecorators(
    ApiOperation({
      summary: 'Submit new email address',
      description:
        'Validates the new email address, checks if already in use, and sends a verification OTP to the new email',
    }),
    ApiResponse({
      status: 200,
      description: 'New email submitted, OTP sent',
      schema: {
        type: 'object',
        properties: {
          verificationId: { type: 'string', format: 'uuid' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Email already in use or invalid change request' }),
  );
}

export function ApiVerifyNewEmail() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify new email and complete change',
      description:
        'Verifies the OTP sent to new email, updates the user email, and sends a notification to old email with a 72-hour revert link',
    }),
    ApiResponse({
      status: 200,
      description: 'Email changed successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          revertToken: { type: 'string', format: 'uuid' },
          revertExpiresAt: { type: 'string', format: 'date-time' },
          newEmail: { type: 'string', format: 'email' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid OTP or change request' }),
    ApiResponse({ status: 401, description: 'Incorrect verification code' }),
  );
}

export function ApiRevertEmailChange() {
  return applyDecorators(
    ApiOperation({
      summary: 'Revert email change',
      description: 'Reverts the email change using the revert token sent to the old email (valid for 72 hours)',
    }),
    ApiResponse({
      status: 200,
      description: 'Email change reverted successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          revertedEmail: { type: 'string', format: 'email' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid or expired revert token' }),
  );
}

export function ApiResendEmailOtp() {
  return applyDecorators(
    ApiOperation({
      summary: 'Resend email verification OTP',
      description: 'Resends the verification OTP to the email address',
    }),
    ApiResponse({
      status: 200,
      description: 'OTP resent successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid verification ID or already verified' }),
  );
}

export function ApiRequestPhoneIdentityVerification() {
  return applyDecorators(
    ApiOperation({
      summary: 'Request identity verification for phone change',
      description: 'Sends a 6-digit OTP to the current phone number to verify user identity before allowing phone change',
    }),
    ApiResponse({
      status: 200,
      description: 'OTP sent successfully',
      schema: {
        type: 'object',
        properties: {
          verificationId: { type: 'string', format: 'uuid' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Phone not verified or other validation error' }),
  );
}

export function ApiVerifyPhoneIdentity() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify identity for phone change',
      description:
        'Verifies the OTP sent to current phone and creates a phone change request. Checks daily rate limit (max 3 per day)',
    }),
    ApiResponse({
      status: 200,
      description: 'Identity verified, change request created',
      schema: {
        type: 'object',
        properties: {
          changeRequestId: { type: 'string', format: 'uuid' },
          changeRequestsToday: { type: 'number' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid OTP or rate limit exceeded' }),
    ApiResponse({ status: 401, description: 'Incorrect verification code' }),
  );
}

export function ApiSubmitNewPhone() {
  return applyDecorators(
    ApiOperation({
      summary: 'Submit new phone number',
      description:
        'Validates the new phone number, checks if already in use, and sends a verification OTP to the new phone',
    }),
    ApiResponse({
      status: 200,
      description: 'New phone submitted, OTP sent',
      schema: {
        type: 'object',
        properties: {
          verificationId: { type: 'string', format: 'uuid' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Phone already in use or invalid change request' }),
  );
}

export function ApiVerifyNewPhone() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify new phone and complete change',
      description:
        'Verifies the OTP sent to new phone, updates the user phone, and sends a notification to old phone with a 72-hour revert token',
    }),
    ApiResponse({
      status: 200,
      description: 'Phone changed successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          revertToken: { type: 'string', format: 'uuid' },
          revertExpiresAt: { type: 'string', format: 'date-time' },
          newPhone: { type: 'string' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid OTP or change request' }),
    ApiResponse({ status: 401, description: 'Incorrect verification code' }),
  );
}

export function ApiRevertPhoneChange() {
  return applyDecorators(
    ApiOperation({
      summary: 'Revert phone change',
      description: 'Reverts the phone change using the revert token sent to the old phone (valid for 72 hours)',
    }),
    ApiResponse({
      status: 200,
      description: 'Phone change reverted successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          revertedPhone: { type: 'string' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid or expired revert token' }),
  );
}

export function ApiResendPhoneOtp() {
  return applyDecorators(
    ApiOperation({
      summary: 'Resend phone verification OTP',
      description: 'Resends the verification OTP to the phone number',
    }),
    ApiResponse({
      status: 200,
      description: 'OTP resent successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Invalid verification ID or already verified' }),
  );
}
