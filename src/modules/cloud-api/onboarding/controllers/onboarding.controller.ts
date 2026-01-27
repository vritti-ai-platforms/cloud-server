import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Onboarding, UserId } from '@vritti/api-sdk';
import { InitiateMobileVerificationDto } from '../dto/initiate-mobile-verification.dto';
import type { MobileVerificationStatusResponseDto } from '../dto/mobile-verification-status-response.dto';
import type { OnboardingStatusResponseDto } from '../dto/onboarding-status-response.dto';
import { SetPasswordDto } from '../dto/set-password.dto';
import { VerifyMobileOtpDto } from '../dto/verify-mobile-otp.dto';
import type { StartOnboardingResponseDto } from '../dto/start-onboarding-response.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { EmailVerificationService } from '../services/email-verification.service';
import { MobileVerificationService } from '../services/mobile-verification.service';
import { OnboardingService } from '../services/onboarding.service';

/**
 * Onboarding Controller
 * Handles user registration and email verification
 */
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

  /**
   * Verify email OTP
   * POST /onboarding/verify-email
   * Requires: Onboarding token in Authorization header + CSRF token
   */
  @Post('verify-email')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using OTP' })
  @ApiBody({ type: VerifyEmailDto, description: 'Email verification OTP payload' })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Email verified successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
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

  /**
   * Resend email verification OTP
   * POST /onboarding/resend-email-otp
   * Requires: Onboarding token in Authorization header + CSRF token
   */
  @Post('resend-email-otp')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification OTP' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'OTP sent successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  @ApiResponse({ status: 429, description: 'Too many requests - Rate limit exceeded' })
  async resendEmailOtp(@UserId() userId: string): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /onboarding/resend-email-otp - User: ${userId}`);

    await this.emailVerificationService.resendOtp(userId);

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  /**
   * Get current onboarding status
   * GET /onboarding/status
   * Requires: Onboarding token in Authorization header
   */
  @Get('status')
  @Onboarding()
  @ApiOperation({ summary: 'Get current onboarding status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current onboarding status for the user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  async getStatus(@UserId() userId: string): Promise<OnboardingStatusResponseDto> {
    this.logger.log(`GET /onboarding/status - User: ${userId}`);

    return await this.onboardingService.getStatus(userId);
  }

  /**
   * Start onboarding process
   * POST /onboarding/start
   * Sends OTP based on current onboarding step (if needed)
   * Requires: Onboarding token in Authorization header + CSRF token
   */
  @Post('start')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or continue the onboarding process' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding process started, returns current step and sends OTP if needed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  async startOnboarding(@UserId() userId: string): Promise<StartOnboardingResponseDto> {
    this.logger.log(`POST /onboarding/start - User: ${userId}`);

    return await this.onboardingService.startOnboarding(userId);
  }

  /**
   * Set password (OAuth users only)
   * POST /onboarding/set-password
   * Requires: Onboarding token in Authorization header + CSRF token
   */
  @Post('set-password')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set password for OAuth users' })
  @ApiBody({ type: SetPasswordDto, description: 'New password payload' })
  @ApiResponse({
    status: 200,
    description: 'Password set successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Password set successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid password format or validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
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

  /**
   * Initiate mobile verification
   * POST /onboarding/mobile-verification/initiate
   * Requires: Onboarding token in Authorization header + CSRF token
   */
  @Post('mobile-verification/initiate')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate mobile phone verification' })
  @ApiBody({ type: InitiateMobileVerificationDto, description: 'Mobile verification initiation payload' })
  @ApiResponse({
    status: 200,
    description: 'Mobile verification initiated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid phone number or verification method' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  async initiateMobileVerification(
    @UserId() userId: string,
    @Body() dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`POST /onboarding/mobile-verification/initiate - User: ${userId}`);

    return await this.mobileVerificationService.initiateVerification(userId, dto);
  }

  /**
   * Get mobile verification status
   * GET /onboarding/mobile-verification/status
   * Requires: Onboarding token in Authorization header
   */
  @Get('mobile-verification/status')
  @Onboarding()
  @ApiOperation({ summary: 'Get current mobile verification status' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current mobile verification status',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  @ApiResponse({ status: 404, description: 'No active mobile verification found' })
  async getMobileVerificationStatus(@UserId() userId: string): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`GET /onboarding/mobile-verification/status - User: ${userId}`);

    return await this.mobileVerificationService.getVerificationStatus(userId);
  }

  /**
   * Resend mobile verification
   * POST /onboarding/mobile-verification/resend
   * Requires: Onboarding token in Authorization header + CSRF token
   */
  @Post('mobile-verification/resend')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend mobile verification code' })
  @ApiBody({ type: InitiateMobileVerificationDto, description: 'Mobile verification resend payload' })
  @ApiResponse({
    status: 200,
    description: 'Mobile verification code resent successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid phone number or verification method' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
  @ApiResponse({ status: 429, description: 'Too many requests - Rate limit exceeded' })
  async resendMobileVerification(
    @UserId() userId: string,
    @Body() dto: InitiateMobileVerificationDto,
  ): Promise<MobileVerificationStatusResponseDto> {
    this.logger.log(`POST /onboarding/mobile-verification/resend - User: ${userId}`);

    return await this.mobileVerificationService.resendVerification(userId, dto);
  }

  /**
   * Verify mobile OTP (for SMS_OTP method)
   * POST /onboarding/mobile-verification/verify-otp
   * Requires: Onboarding token in Authorization header + CSRF token
   */
  @Post('mobile-verification/verify-otp')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify mobile phone number using OTP' })
  @ApiBody({ type: VerifyMobileOtpDto, description: 'Mobile OTP verification payload' })
  @ApiResponse({
    status: 200,
    description: 'Phone number verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Phone number verified successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing onboarding token' })
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
