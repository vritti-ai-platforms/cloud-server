import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { emailVerifications, OnboardingStepValues } from '@/db/schema';
import { EmailService } from '../../../../services';
import { UserService } from '../../user/user.service';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import { OtpService } from './otp.service';

/**
 * Options for sending verification OTP
 * Used to pass user data and avoid redundant database queries
 */
export interface SendVerificationOtpOptions {
  userId: string;
  email: string;
  firstName?: string | null;
}

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly emailVerificationRepo: EmailVerificationRepository,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
  ) {}

  /**
   * Send email verification OTP to user
   * @param userId - User ID
   * @param email - User's email address
   * @param firstName - Optional first name for email personalization (avoids extra DB query if provided)
   */
  async sendVerificationOtp(userId: string, email: string, firstName?: string | null): Promise<void> {
    // Generate OTP
    const otp = this.otpService.generateOtp();
    // Security: Never log OTP values in production - GDPR/PCI compliance
    this.logger.log(`Generated OTP for user ${userId}`);
    const hashedOtp = await this.otpService.hashOtp(otp);
    const expiresAt = this.otpService.getOtpExpiryTime();

    // Store in database
    await this.emailVerificationRepo.create({
      userId,
      email,
      otp: hashedOtp,
      expiresAt,
    });

    // Fire and forget - don't block response waiting for email
    this.emailService
      .sendVerificationEmail(email, otp, firstName || undefined)
      .then(() => {
        this.logger.log(`Sent email verification OTP to ${email} for user ${userId}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to send verification email to ${email}: ${error.message}`);
      });
  }

  /**
   * Verify email OTP
   */
  async verifyOtp(userId: string, otp: string): Promise<void> {
    // Find latest verification
    const verification = await this.emailVerificationRepo.findLatestByUserId(userId);

    if (!verification) {
      throw new BadRequestException(
        'No verification request found. Please request a new OTP',
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    // Validate OTP attempt (expiry and max attempts)
    this.otpService.validateOtpAttempt(verification);

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(otp, verification.otp);

    if (!isValid) {
      // Increment failed attempts
      await this.emailVerificationRepo.incrementAttempts(verification.id);
      throw new UnauthorizedException(
        'code',
        'Invalid OTP. Please try again',
        'The verification code you entered is incorrect. Please check the code and try again.',
      );
    }

    // Mark verification as complete
    await this.emailVerificationRepo.markAsVerified(verification.id);

    // Update user's email verification status
    await this.userService.markEmailVerified(userId);

    // Update onboarding step to MOBILE_VERIFICATION
    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.MOBILE_VERIFICATION,
    });

    this.logger.log(`Email verified successfully for user ${userId}`);
  }

  /**
   * Resend verification OTP
   */
  async resendOtp(userId: string): Promise<void> {
    // Find user by ID to get email
    const userResponse = await this.userService.findById(userId);

    if (userResponse.emailVerified) {
      throw new BadRequestException(
        'Email already verified',
        'Your email has already been verified. You can proceed to the next step.',
      );
    }

    // Delete old verifications
    await this.emailVerificationRepo.deleteMany(eq(emailVerifications.userId, userId));

    // Send new OTP - pass firstName to avoid redundant DB query
    await this.sendVerificationOtp(userId, userResponse.email, userResponse.firstName);

    this.logger.log(`Resent email verification OTP for user ${userId}`);
  }
}
