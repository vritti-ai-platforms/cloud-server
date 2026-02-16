import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { OnboardingStepValues, VerificationChannelValues } from '@/db/schema';
import { EmailService } from '../../../../../services';
import { UserService } from '../../../user/services/user.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { VerifyEmailDto } from '../dto/request/verify-email.dto';
import { ResendEmailOtpResponseDto } from '../dto/response/resend-email-otp-response.dto';
import { VerifyEmailResponseDto } from '../dto/response/verify-email-response.dto';

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
    const userResponse = await this.userService.findById(userId);

    if (userResponse.emailVerified) {
      throw new BadRequestException(
        'Your email has already been verified. You can proceed to the next step.',
      );
    }

    const { otp } = await this.verificationService.createVerification(
      userId,
      VerificationChannelValues.EMAIL,
      userResponse.email,
    );

    this.emailService
      .sendVerificationEmail(userResponse.email, otp, userResponse.displayName)
      .then(() => {
        this.logger.log(`Sent email verification OTP to ${userResponse.email} for user ${userId}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to send verification email to ${userResponse.email}: ${error.message}`);
      });

    return {
      success: true,
      message: 'Verification code sent to your email',
    };
  }

  // Validates the email OTP and marks the user's email as verified
  async verifyEmail(userId: string, dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    await this.verificationService.verifyOtpByChannel(userId, VerificationChannelValues.EMAIL, dto.otp);

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

  // Invalidates previous OTPs and sends a fresh email verification code
  async resendOtp(userId: string): Promise<ResendEmailOtpResponseDto> {
    const userResponse = await this.userService.findById(userId);

    if (userResponse.emailVerified) {
      throw new BadRequestException(
        'Your email has already been verified. You can proceed to the next step.',
      );
    }

    const result = await this.verificationService.resendVerificationByChannel(
      userId,
      VerificationChannelValues.EMAIL,
    );

    this.emailService
      .sendVerificationEmail(userResponse.email, result.otp, userResponse.displayName)
      .then(() => {
        this.logger.log(`Resent email verification OTP for user ${userId}`);
      })
      .catch((error) => {
        this.logger.error(`Failed to resend verification email: ${error.message}`);
      });

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }
}
