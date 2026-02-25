import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException, EmailService, ForbiddenException } from '@vritti/api-sdk';
import { OnboardingStepValues, VerificationChannelValues } from '@/db/schema';
import { UserService } from '../../../user/services/user.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { type ChangeEmailDto } from '../dto/request/change-email.dto';
import { VerifyEmailDto } from '../dto/request/verify-email.dto';
import { type ResendEmailOtpResponseDto } from '../dto/response/resend-email-otp-response.dto';
import { type VerifyEmailResponseDto } from '../dto/response/verify-email-response.dto';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly verificationService: VerificationService,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
  ) {}

  // Creates a verification record and sends the OTP email
  async sendVerificationOtp(userId: string): Promise<ResendEmailOtpResponseDto> {
    const user = await this.userService.findById(userId);

    if (user.emailVerified) {
      throw new BadRequestException('Your email has already been verified. You can proceed to the next step.');
    }

    const { otp, expiresAt } = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.EMAIL,
      user.email,
    );

    this.emailService
      .sendVerificationEmail(user.email, otp, expiresAt, user.displayName)
      .then(() => {
        this.logger.log(`Sent email verification OTP to ${user.email} for user ${userId}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to send verification email to ${user.email}: ${error.message}`);
      });

    return {
      success: true,
      message: 'Verification code sent to your email',
    };
  }

  // Validates the email OTP and marks the user's email as verified
  async verifyEmail(userId: string, dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    await this.verificationService.verifyVerification(dto.otp, VerificationChannelValues.EMAIL, userId);

    await this.userService.markEmailVerified(userId);

    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.MOBILE_VERIFICATION,
    });

    this.logger.log(`Email verified successfully for user ${userId}`);

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  // Updates the user's email and sends a new verification OTP to it
  async changeEmail(userId: string, dto: ChangeEmailDto): Promise<ResendEmailOtpResponseDto> {
    const user = await this.userService.findById(userId);

    if (user.emailVerified || user.onboardingStep === OnboardingStepValues.COMPLETE) {
      throw new ForbiddenException('Email cannot be changed using this API.');
    }

    if (dto.email.toLowerCase() === user.email.toLowerCase()) {
      throw new BadRequestException({
        label: 'Same Email',
        detail: 'New email must be different from your current email address.',
        errors: [{ field: 'email', message: 'Same as current email' }],
      });
    }

    const emailTaken = await this.userService.emailExists(dto.email);
    if (emailTaken) {
      throw new ConflictException({
        label: 'Email Already In Use',
        detail: 'This email address is already associated with another account.',
        errors: [{ field: 'email', message: 'Email already taken' }],
      });
    }

    await this.userService.update(userId, { email: dto.email, emailVerified: false });

    const { otp, expiresAt } = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.EMAIL,
      dto.email,
    );

    this.emailService.sendVerificationEmail(dto.email, otp, expiresAt, user.displayName ?? undefined).catch((error) => {
      this.logger.error(`Failed to send verification email to ${dto.email}: ${error.message}`);
    });

    return { success: true, message: 'Email updated. A new verification code has been sent.' };
  }
}
