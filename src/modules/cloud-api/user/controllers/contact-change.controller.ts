import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import {
  ResendOtpDto,
  RevertEmailChangeDto,
  SubmitNewEmailDto,
  VerifyIdentityDto,
  VerifyNewEmailDto,
} from '../dto/contact-change.dto';
import { EmailChangeService } from '../services/email-change.service';

/**
 * Controller for handling secure email/phone contact change with verification
 * Implements 4-step flow:
 * 1. Confirm identity (OTP to current email/phone)
 * 2. Enter new value
 * 3. Verify new value (OTP to new email/phone)
 * 4. Success with revert token (72h validity)
 */
@ApiTags('Contact Change')
@ApiBearerAuth()
@Controller('users/contact')
export class ContactChangeController {
  constructor(private readonly emailChangeService: EmailChangeService) {}

  // ============================================================================
  // Email Change Endpoints
  // ============================================================================

  /**
   * Step 1: Request identity verification for email change
   * Sends OTP to current email to confirm user identity
   */
  @Post('email/request-identity-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request identity verification for email change',
    description: 'Sends a 6-digit OTP to the current email address to verify user identity before allowing email change',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        verificationId: { type: 'string', format: 'uuid' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email not verified or other validation error' })
  async requestEmailIdentityVerification(@UserId() userId: string) {
    return this.emailChangeService.requestIdentityVerification(userId);
  }

  /**
   * Step 2: Verify identity and create change request
   * Verifies OTP sent to current email and initiates the change request
   */
  @Post('email/verify-identity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify identity for email change',
    description:
      'Verifies the OTP sent to current email and creates an email change request. Checks daily rate limit (max 3 per day)',
  })
  @ApiResponse({
    status: 200,
    description: 'Identity verified, change request created',
    schema: {
      type: 'object',
      properties: {
        changeRequestId: { type: 'string', format: 'uuid' },
        changeRequestsToday: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP or rate limit exceeded' })
  @ApiResponse({ status: 401, description: 'Incorrect verification code' })
  async verifyEmailIdentity(@UserId() userId: string, @Body() dto: VerifyIdentityDto) {
    return this.emailChangeService.verifyIdentity(userId, dto.verificationId, dto.otpCode);
  }

  /**
   * Step 3: Submit new email and send verification OTP
   * Validates new email and sends OTP to the new email address
   */
  @Post('email/submit-new-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit new email address',
    description:
      'Validates the new email address, checks if already in use, and sends a verification OTP to the new email',
  })
  @ApiResponse({
    status: 200,
    description: 'New email submitted, OTP sent',
    schema: {
      type: 'object',
      properties: {
        verificationId: { type: 'string', format: 'uuid' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email already in use or invalid change request' })
  async submitNewEmail(@UserId() userId: string, @Body() dto: SubmitNewEmailDto) {
    return this.emailChangeService.submitNewEmail(userId, dto.changeRequestId, dto.newEmail);
  }

  /**
   * Step 4: Verify new email and complete the change
   * Verifies OTP sent to new email, updates user's email, and generates revert token
   */
  @Post('email/verify-new-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify new email and complete change',
    description:
      'Verifies the OTP sent to new email, updates the user email, and sends a notification to old email with a 72-hour revert link',
  })
  @ApiResponse({
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
  })
  @ApiResponse({ status: 400, description: 'Invalid OTP or change request' })
  @ApiResponse({ status: 401, description: 'Incorrect verification code' })
  async verifyNewEmail(@UserId() userId: string, @Body() dto: VerifyNewEmailDto) {
    return this.emailChangeService.verifyNewEmail(userId, dto.changeRequestId, dto.verificationId, dto.otpCode);
  }

  /**
   * Revert email change using revert token
   * Restores the old email address within 72 hours of the change
   */
  @Post('email/revert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revert email change',
    description: 'Reverts the email change using the revert token sent to the old email (valid for 72 hours)',
  })
  @ApiResponse({
    status: 200,
    description: 'Email change reverted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        revertedEmail: { type: 'string', format: 'email' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired revert token' })
  async revertEmailChange(@Body() dto: RevertEmailChangeDto) {
    return this.emailChangeService.revertChange(dto.revertToken);
  }

  /**
   * Resend OTP for email verification
   * Resends the OTP to the email address associated with the verification
   */
  @Post('email/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification OTP',
    description: 'Resends the verification OTP to the email address',
  })
  @ApiResponse({
    status: 200,
    description: 'OTP resent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid verification ID or already verified' })
  async resendEmailOtp(@UserId() userId: string, @Body() dto: ResendOtpDto) {
    return this.emailChangeService.resendOtp(userId, dto.verificationId);
  }

  // ============================================================================
  // Phone Change Endpoints
  // ============================================================================
  // TODO: Implement phone change endpoints following the same pattern as email
  // - POST phone/request-identity-verification
  // - POST phone/verify-identity
  // - POST phone/submit-new-phone
  // - POST phone/verify-new-phone
  // - POST phone/revert
  // - POST phone/resend-otp
}
