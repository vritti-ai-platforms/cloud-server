import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { emailVerifications, OnboardingStepValues } from '@/db/schema';
import { EmailService } from '../../../../../services';
import { UserService } from '../../../user/services/user.service';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import { OtpService } from './otp.service';

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

  // Generates a hashed OTP, persists it, and sends the verification email
  async sendVerificationOtp(userId: string, email: string, firstName?: string | null): Promise<void> {
    const otp = this.otpService.generateOtp();
    this.logger.log(`Generated OTP for user ${userId}`);
    const hashedOtp = await this.otpService.hashOtp(otp);
    const expiresAt = this.otpService.getOtpExpiryTime();

    await this.emailVerificationRepo.create({
      userId,
      email,
      otp: hashedOtp,
      expiresAt,
    });

    this.emailService
      .sendVerificationEmail(email, otp, firstName || undefined)
      .then(() => {
        this.logger.log(`Sent email verification OTP to ${email} for user ${userId}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to send verification email to ${email}: ${error.message}`);
      });
  }

  // Validates the OTP against the stored hash and advances onboarding on success
  async verifyOtp(userId: string, otp: string): Promise<void> {
    const verification = await this.emailVerificationRepo.findLatestByUserId(userId);

    if (!verification) {
      throw new BadRequestException(
        "We couldn't find a verification code for your account. Please request a new code to continue.",
      );
    }

    this.otpService.validateOtpAttempt(verification);

    const isValid = await this.otpService.verifyOtp(otp, verification.otp);

    if (!isValid) {
      await this.emailVerificationRepo.incrementAttempts(verification.id);
      throw new UnauthorizedException({
        label: 'Invalid Code',
        detail: 'The verification code you entered is incorrect. Please check the code and try again.',
        errors: [
          {
            field: 'code',
            message: 'Invalid verification code',
          },
        ],
      });
    }

    await this.emailVerificationRepo.markAsVerified(verification.id);

    await this.userService.markEmailVerified(userId);

    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.MOBILE_VERIFICATION,
    });

    this.logger.log(`Email verified successfully for user ${userId}`);
  }

  // Deletes existing verifications and sends a new OTP to the user's email
  async resendOtp(userId: string): Promise<void> {
    const userResponse = await this.userService.findById(userId);

    if (userResponse.emailVerified) {
      throw new BadRequestException(
        'Your email has already been verified. You can proceed to the next step.',
      );
    }

    await this.emailVerificationRepo.deleteMany(eq(emailVerifications.userId, userId));

    await this.sendVerificationOtp(userId, userResponse.email, userResponse.firstName);

    this.logger.log(`Resent email verification OTP for user ${userId}`);
  }
}
