import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Onboarding, UserId } from '@vritti/api-sdk';
import { ApiChangeEmail, ApiSendEmailOtp, ApiVerifyEmail } from '../docs/email-verification.docs';
import { type ChangeEmailDto } from '../dto/request/change-email.dto';
import { VerifyEmailDto } from '../dto/request/verify-email.dto';
import { type ResendEmailOtpResponseDto } from '../dto/response/resend-email-otp-response.dto';
import { type VerifyEmailResponseDto } from '../dto/response/verify-email-response.dto';
import { EmailVerificationService } from '../services/email-verification.service';

@ApiTags('Onboarding - Email Verification')
@ApiBearerAuth()
@Controller('onboarding/email-verification')
export class EmailVerificationController {
  private readonly logger = new Logger(EmailVerificationController.name);

  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // Creates a verification record and sends the initial email OTP
  @Post('send-otp')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiSendEmailOtp()
  async sendEmailOtp(@UserId() userId: string): Promise<ResendEmailOtpResponseDto> {
    this.logger.log(`POST /onboarding/email-verification/send-otp - User: ${userId}`);
    return this.emailVerificationService.sendVerificationOtp(userId);
  }

  // Validates the email OTP and marks the user's email as verified
  @Post('verify-otp')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyEmail()
  async verifyEmail(@UserId() userId: string, @Body() dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    this.logger.log(`POST /onboarding/email-verification/verify-otp - User: ${userId}`);
    return this.emailVerificationService.verifyEmail(userId, dto);
  }

  // Updates the user's email and sends a new OTP to it
  @Post('change-email')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiChangeEmail()
  async changeEmail(@UserId() userId: string, @Body() dto: ChangeEmailDto): Promise<ResendEmailOtpResponseDto> {
    this.logger.log(`POST /onboarding/email-verification/change-email - User: ${userId}`);
    return this.emailVerificationService.changeEmail(userId, dto);
  }
}
