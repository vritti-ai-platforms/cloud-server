import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import {
  ApiRequestEmailIdentityVerification,
  ApiVerifyEmailIdentity,
  ApiSubmitNewEmail,
  ApiVerifyNewEmail,
  ApiRevertEmailChange,
  ApiResendEmailOtp,
  ApiRequestPhoneIdentityVerification,
  ApiVerifyPhoneIdentity,
  ApiSubmitNewPhone,
  ApiVerifyNewPhone,
  ApiRevertPhoneChange,
  ApiResendPhoneOtp,
} from '../docs/contact-change.docs';
import {
  ResendOtpDto,
  RevertEmailChangeDto,
  RevertPhoneChangeDto,
  SubmitNewEmailDto,
  SubmitNewPhoneDto,
  VerifyIdentityDto,
  VerifyNewEmailDto,
  VerifyNewPhoneDto,
} from '../dto/contact-change.dto';
import { EmailChangeService } from '../services/email-change.service';
import { PhoneChangeService } from '../services/phone-change.service';

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
  constructor(
    private readonly emailChangeService: EmailChangeService,
    private readonly phoneChangeService: PhoneChangeService,
  ) {}

  // ============================================================================
  // Email Change Endpoints
  // ============================================================================

  /**
   * Step 1: Request identity verification for email change
   * Sends OTP to current email to confirm user identity
   */
  @Post('email/request-identity-verification')
  @HttpCode(HttpStatus.OK)
  @ApiRequestEmailIdentityVerification()
  async requestEmailIdentityVerification(@UserId() userId: string) {
    return this.emailChangeService.requestIdentityVerification(userId);
  }

  /**
   * Step 2: Verify identity and create change request
   * Verifies OTP sent to current email and initiates the change request
   */
  @Post('email/verify-identity')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyEmailIdentity()
  async verifyEmailIdentity(@UserId() userId: string, @Body() dto: VerifyIdentityDto) {
    return this.emailChangeService.verifyIdentity(userId, dto.verificationId, dto.otpCode);
  }

  /**
   * Step 3: Submit new email and send verification OTP
   * Validates new email and sends OTP to the new email address
   */
  @Post('email/submit-new-email')
  @HttpCode(HttpStatus.OK)
  @ApiSubmitNewEmail()
  async submitNewEmail(@UserId() userId: string, @Body() dto: SubmitNewEmailDto) {
    return this.emailChangeService.submitNewEmail(userId, dto.changeRequestId, dto.newEmail);
  }

  /**
   * Step 4: Verify new email and complete the change
   * Verifies OTP sent to new email, updates user's email, and generates revert token
   */
  @Post('email/verify-new-email')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyNewEmail()
  async verifyNewEmail(@UserId() userId: string, @Body() dto: VerifyNewEmailDto) {
    return this.emailChangeService.verifyNewEmail(userId, dto.changeRequestId, dto.verificationId, dto.otpCode);
  }

  /**
   * Revert email change using revert token
   * Restores the old email address within 72 hours of the change
   */
  @Post('email/revert')
  @HttpCode(HttpStatus.OK)
  @ApiRevertEmailChange()
  async revertEmailChange(@Body() dto: RevertEmailChangeDto) {
    return this.emailChangeService.revertChange(dto.revertToken);
  }

  /**
   * Resend OTP for email verification
   * Resends the OTP to the email address associated with the verification
   */
  @Post('email/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiResendEmailOtp()
  async resendEmailOtp(@UserId() userId: string, @Body() dto: ResendOtpDto) {
    return this.emailChangeService.resendOtp(userId, dto.verificationId);
  }

  // ============================================================================
  // Phone Change Endpoints
  // ============================================================================

  /**
   * Step 1: Request identity verification for phone change
   * Sends OTP to current phone to confirm user identity
   */
  @Post('phone/request-identity-verification')
  @HttpCode(HttpStatus.OK)
  @ApiRequestPhoneIdentityVerification()
  async requestPhoneIdentityVerification(@UserId() userId: string) {
    return this.phoneChangeService.requestIdentityVerification(userId);
  }

  /**
   * Step 2: Verify identity and create change request
   * Verifies OTP sent to current phone and initiates the change request
   */
  @Post('phone/verify-identity')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyPhoneIdentity()
  async verifyPhoneIdentity(@UserId() userId: string, @Body() dto: VerifyIdentityDto) {
    return this.phoneChangeService.verifyIdentity(userId, dto.verificationId, dto.otpCode);
  }

  /**
   * Step 3: Submit new phone and send verification OTP
   * Validates new phone and sends OTP to the new phone number
   */
  @Post('phone/submit-new-phone')
  @HttpCode(HttpStatus.OK)
  @ApiSubmitNewPhone()
  async submitNewPhone(@UserId() userId: string, @Body() dto: SubmitNewPhoneDto) {
    return this.phoneChangeService.submitNewPhone(userId, dto.changeRequestId, dto.newPhone, dto.newPhoneCountry);
  }

  /**
   * Step 4: Verify new phone and complete the change
   * Verifies OTP sent to new phone, updates user's phone, and generates revert token
   */
  @Post('phone/verify-new-phone')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyNewPhone()
  async verifyNewPhone(@UserId() userId: string, @Body() dto: VerifyNewPhoneDto) {
    return this.phoneChangeService.verifyNewPhone(userId, dto.changeRequestId, dto.verificationId, dto.otpCode);
  }

  /**
   * Revert phone change using revert token
   * Restores the old phone number within 72 hours of the change
   */
  @Post('phone/revert')
  @HttpCode(HttpStatus.OK)
  @ApiRevertPhoneChange()
  async revertPhoneChange(@Body() dto: RevertPhoneChangeDto) {
    return this.phoneChangeService.revertChange(dto.revertToken);
  }

  /**
   * Resend OTP for phone verification
   * Resends the OTP to the phone number associated with the verification
   */
  @Post('phone/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiResendPhoneOtp()
  async resendPhoneOtp(@UserId() userId: string, @Body() dto: ResendOtpDto) {
    return this.phoneChangeService.resendOtp(userId, dto.verificationId);
  }
}
