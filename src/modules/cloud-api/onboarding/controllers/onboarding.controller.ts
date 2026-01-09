import { Body, Controller, Get, HttpCode, HttpStatus, Logger, Post, Request } from '@nestjs/common';
import { Onboarding } from '@vritti/api-sdk';
import type { FastifyRequest } from 'fastify';
import type { OnboardingStatusResponseDto } from '../dto/onboarding-status-response.dto';
import type { SetPasswordDto } from '../dto/set-password.dto';
import type { StartOnboardingResponseDto } from '../dto/start-onboarding-response.dto';
import type { VerifyEmailDto } from '../dto/verify-email.dto';
import { EmailVerificationService } from '../services/email-verification.service';
import { OnboardingService } from '../services/onboarding.service';

/**
 * Authenticated request interface with user information
 */
interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    type: string;
  };
}

/**
 * Onboarding Controller
 * Handles user registration and email verification
 */
@Controller('onboarding')
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Verify email OTP
   * POST /onboarding/verify-email
   * Requires: Onboarding token in Authorization header + CSRF token
   */
  @Post('verify-email')
  @Onboarding()
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Request() req: AuthenticatedRequest,
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ success: boolean; message: string }> {
    const userId: string = req.user.id;
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
  async resendEmailOtp(@Request() req: AuthenticatedRequest): Promise<{ success: boolean; message: string }> {
    const userId: string = req.user.id;
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
  async getStatus(@Request() req: AuthenticatedRequest): Promise<OnboardingStatusResponseDto> {
    const userId: string = req.user.id;
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
  async startOnboarding(@Request() req: AuthenticatedRequest): Promise<StartOnboardingResponseDto> {
    const userId: string = req.user.id;
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
  async setPassword(
    @Request() req: AuthenticatedRequest,
    @Body() setPasswordDto: SetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    const userId: string = req.user.id;
    const password: string = setPasswordDto.password;
    this.logger.log(`POST /onboarding/set-password - User: ${userId}`);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.onboardingService.setPassword(userId, password);

    return {
      success: true,
      message: 'Password set successfully',
    };
  }
}
