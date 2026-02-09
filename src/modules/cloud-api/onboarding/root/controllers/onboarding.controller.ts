import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Onboarding, UserId } from '@vritti/api-sdk';
import {
  ApiVerifyEmail,
  ApiResendEmailOtp,
  ApiGetStatus,
  ApiStartOnboarding,
  ApiSetPassword,
  ApiInitiateMobileVerification,
  ApiGetMobileVerificationStatus,
  ApiResendMobileVerification,
  ApiVerifyMobileOtp,
} from '../docs/onboarding.docs';
import { InitiateMobileVerificationDto } from '../../mobile-verification/dto/initiate-mobile-verification.dto';
import type { MobileVerificationStatusResponseDto } from '../../mobile-verification/dto/mobile-verification-status-response.dto';
import type { OnboardingStatusResponseDto } from '../dto/onboarding-status-response.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { VerifyMobileOtpDto } from '../../mobile-verification/dto/verify-mobile-otp.dto';
import type { StartOnboardingResponseDto } from '../dto/start-onboarding-response.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { EmailVerificationService } from '../services/email-verification.service';
import { MobileVerificationService } from '../../mobile-verification/services/mobile-verification.service';
import { OnboardingService } from '../services/onboarding.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mobileVerificationService: MobileVerificationService,
  ) {}

  // Validates the email OTP and marks the user's email as verified
  @Post('verify-email')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyEmail()
  async verifyEmail(
    @UserId() userId: string,
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /onboarding/verify-email - User: ${userId}`);

    await this.emailVerificationService.verifyOtp(userId, verifyEmailDto.otp);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  // Invalidates previous OTPs and sends a fresh email verification code
  @Post('resend-email-otp')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiResendEmailOtp()
  async resendEmailOtp(@UserId() userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /onboarding/resend-email-otp - User: ${userId}`);

    await this.emailVerificationService.resendOtp(userId);

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  // Retrieves the user's current onboarding step and completion status
  @Get('status')
  @Onboarding()
  @ApiGetStatus()
  async getStatus(@UserId() userId: string): Promise<OnboardingStatusResponseDto> {
    this.logger.log(`GET /onboarding/status - User: ${userId}`);

    return await this.onboardingService.getStatus(userId);
  }

  // Begins the onboarding flow and triggers step-specific actions like sending OTPs
  @Post('start')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiStartOnboarding()
  async startOnboarding(@UserId() userId: string): Promise<StartOnboardingResponseDto> {
    this.logger.log(`POST /onboarding/start - User: ${userId}`);

    return await this.onboardingService.startOnboarding(userId);
  }

  // Hashes and stores the user's password during onboarding
  @Post('set-password')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiSetPassword()
  async setPassword(
    @UserId() userId: string,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const password: string = setPasswordDto.password;
    this.logger.log(`POST /onboarding/set-password - User: ${userId}`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.onboardingService.setPassword(userId, password);

    return {
      success: true,
      message: 'Password set successfully',
    };
  }

  // Starts mobile verification using the chosen method (WhatsApp, SMS, or OTP)
  @Post('mobile-verification/initiate')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiInitiateMobileVerification()
  async initiateMobileVerification(
    @UserId() userId: string,
    @Body() dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`POST /onboarding/mobile-verification/initiate - User: ${userId}`);

    return await this.mobileVerificationService.initiateVerification(userId, dto);
  }

  // Returns the current mobile verification state for the user
  @Get('mobile-verification/status')
  @Onboarding()
  @ApiGetMobileVerificationStatus()
  async getMobileVerificationStatus(@UserId() userId: string): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`GET /onboarding/mobile-verification/status - User: ${userId}`);

    return await this.mobileVerificationService.getVerificationStatus(userId);
  }

  // Cancels the existing verification and initiates a new one
  @Post('mobile-verification/resend')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiResendMobileVerification()
  async resendMobileVerification(
    @UserId() userId: string,
    @Body() dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`POST /onboarding/mobile-verification/resend - User: ${userId}`);

    return await this.mobileVerificationService.resendVerification(userId, dto);
  }

  // Validates the manually-entered OTP for mobile phone verification
  @Post('mobile-verification/verify-otp')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyMobileOtp()
  async verifyMobileOtp(
    @UserId() userId: string,
    @Body() dto: VerifyMobileOtpDto,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /onboarding/mobile-verification/verify-otp - User: ${userId}`);

    await this.mobileVerificationService.verifyOtp(userId, dto.otp);

    return {
      success: true,
      message: 'Phone number verified successfully',
    };
  }
}
