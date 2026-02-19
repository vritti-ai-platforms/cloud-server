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
  RevertEmailChangeDto,
  RevertPhoneChangeDto,
  SubmitNewEmailDto,
  SubmitNewPhoneDto,
  VerifyIdentityDto,
  VerifyNewEmailDto,
  VerifyNewPhoneDto,
} from '../dto/request/contact-change.dto';
import { EmailChangeService } from '../services/email-change.service';
import { PhoneChangeService } from '../services/phone-change.service';

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

  // Sends an OTP to the user's current email to confirm identity
  @Post('email/request-identity-verification')
  @HttpCode(HttpStatus.OK)
  @ApiRequestEmailIdentityVerification()
  async requestEmailIdentityVerification(@UserId() userId: string) {
    return this.emailChangeService.requestIdentityVerification(userId);
  }

  // Verifies the identity OTP and creates an email change request
  @Post('email/verify-identity')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyEmailIdentity()
  async verifyEmailIdentity(@UserId() userId: string, @Body() dto: VerifyIdentityDto) {
    return this.emailChangeService.verifyIdentity(userId, dto.otpCode);
  }

  // Validates the new email and sends a verification OTP to it
  @Post('email/submit-new-email')
  @HttpCode(HttpStatus.OK)
  @ApiSubmitNewEmail()
  async submitNewEmail(@UserId() userId: string, @Body() dto: SubmitNewEmailDto) {
    return this.emailChangeService.submitNewEmail(userId, dto.changeRequestId, dto.newEmail);
  }

  // Verifies the new email OTP and completes the email change
  @Post('email/verify-new-email')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyNewEmail()
  async verifyNewEmail(@UserId() userId: string, @Body() dto: VerifyNewEmailDto) {
    return this.emailChangeService.verifyNewEmail(userId, dto.changeRequestId, dto.otpCode);
  }

  // Reverts a completed email change using a revert token
  @Post('email/revert')
  @HttpCode(HttpStatus.OK)
  @ApiRevertEmailChange()
  async revertEmailChange(@Body() dto: RevertEmailChangeDto) {
    return this.emailChangeService.revertChange(dto.revertToken);
  }

  // Resends the email verification OTP for the active verification
  @Post('email/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiResendEmailOtp()
  async resendEmailOtp(@UserId() userId: string) {
    return this.emailChangeService.resendOtp(userId);
  }

  // ============================================================================
  // Phone Change Endpoints
  // ============================================================================

  // Sends an OTP to the user's current phone to confirm identity
  @Post('phone/request-identity-verification')
  @HttpCode(HttpStatus.OK)
  @ApiRequestPhoneIdentityVerification()
  async requestPhoneIdentityVerification(@UserId() userId: string) {
    return this.phoneChangeService.requestIdentityVerification(userId);
  }

  // Verifies the identity OTP and creates a phone change request
  @Post('phone/verify-identity')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyPhoneIdentity()
  async verifyPhoneIdentity(@UserId() userId: string, @Body() dto: VerifyIdentityDto) {
    return this.phoneChangeService.verifyIdentity(userId, dto.otpCode);
  }

  // Validates the new phone number and sends a verification OTP to it
  @Post('phone/submit-new-phone')
  @HttpCode(HttpStatus.OK)
  @ApiSubmitNewPhone()
  async submitNewPhone(@UserId() userId: string, @Body() dto: SubmitNewPhoneDto) {
    return this.phoneChangeService.submitNewPhone(userId, dto.changeRequestId, dto.newPhone, dto.newPhoneCountry);
  }

  // Verifies the new phone OTP and completes the phone change
  @Post('phone/verify-new-phone')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyNewPhone()
  async verifyNewPhone(@UserId() userId: string, @Body() dto: VerifyNewPhoneDto) {
    return this.phoneChangeService.verifyNewPhone(userId, dto.changeRequestId, dto.otpCode);
  }

  // Reverts a completed phone change using a revert token
  @Post('phone/revert')
  @HttpCode(HttpStatus.OK)
  @ApiRevertPhoneChange()
  async revertPhoneChange(@Body() dto: RevertPhoneChangeDto) {
    return this.phoneChangeService.revertChange(dto.revertToken);
  }

  // Resends the phone verification OTP for the active verification
  @Post('phone/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiResendPhoneOtp()
  async resendPhoneOtp(@UserId() userId: string) {
    return this.phoneChangeService.resendOtp(userId);
  }
}
