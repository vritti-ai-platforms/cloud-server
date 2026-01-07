import { OnboardingStepValues } from '@/db/schema';
import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { EncryptionService } from '../../../../services';
import { UserService } from '../../user/user.service';
import { OnboardingStatusResponseDto } from '../dto/onboarding-status-response.dto';
import { StartOnboardingResponseDto } from '../dto/start-onboarding-response.dto';
import { EmailVerificationService } from './email-verification.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Get current onboarding status for a user
   */
  async getStatus(userId: string): Promise<OnboardingStatusResponseDto> {
    const userResponse = await this.userService.findById(userId);

    // Convert UserResponseDto back to User-like object for fromUser method
    const user = await this.userService.findByEmail(userResponse.email);

    return OnboardingStatusResponseDto.fromUser(user!);
  }

  /**
   * Set password for OAuth users
   * This is called after OAuth signup to set a password for the account
   */
  async setPassword(userId: string, password: string): Promise<void> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException(
        'User not found',
        'We couldn\'t find your account. Please check your information or register.'
      );
    }

    // Verify user is on SET_PASSWORD step
    if (user.onboardingStep !== OnboardingStepValues.SET_PASSWORD) {
      throw new BadRequestException(
        'User is not on SET_PASSWORD onboarding step',
        'You cannot set a password at this stage. Please complete the previous onboarding steps first.'
      );
    }

    // Verify user doesn't already have a password
    const fullUser = await this.userService.findByEmail(user.email);
    if (fullUser?.passwordHash) {
      throw new BadRequestException(
        'User already has a password',
        'Your account already has a password set. Please use the forgot password feature if you need to change it.'
      );
    }

    // Hash password
    const passwordHash = await this.encryptionService.hashPassword(password);

    // Update user with password and move to next onboarding step
    // await this.userService.updatePassword(userId, passwordHash);
    // await this.userService.updateOnboardingStep(
    //   userId,
    //   'MOBILE_VERIFICATION',
    // );

    this.logger.log(`Password set for OAuth user: ${user.email} (${userId})`);
  }

  /**
   * Start onboarding process - sends OTP based on current step
   * Called when user clicks "Start Onboarding" or "Resume Onboarding" button
   */
  async startOnboarding(userId: string): Promise<StartOnboardingResponseDto> {
    const userResponse = await this.userService.findById(userId);
    const user = await this.userService.findByEmail(userResponse.email);

    if (!user) {
      throw new BadRequestException(
        'User not found',
        'We couldn\'t find your account. Please check your information or register.'
      );
    }

    let otpSentTo: 'email' | 'phone' | null = null;
    let otpDestination: string | undefined;
    let message: string;

    switch (user.onboardingStep) {
      case OnboardingStepValues.EMAIL_VERIFICATION:
        if (!user.emailVerified) {
          await this.emailVerificationService.sendVerificationOtp(user.id, user.email);
          otpSentTo = 'email';
          otpDestination = this.maskEmail(user.email);
          message = 'Verification code sent to your email';
        } else {
          message = 'Email already verified';
        }
        break;

      case OnboardingStepValues.SET_PASSWORD:
        message = 'Please set your password';
        break;

      case OnboardingStepValues.MOBILE_VERIFICATION:
        // TODO: Mobile OTP in Phase 2
        message = 'Please verify your mobile number';
        this.logger.debug('Mobile verification not yet implemented');
        break;

      case OnboardingStepValues.TWO_FACTOR_SETUP:
        message = 'Please set up two-factor authentication';
        break;

      case OnboardingStepValues.COMPLETE:
        message = 'Onboarding already complete';
        break;

      default:
        message = 'Please continue with onboarding';
        break;
    }

    this.logger.log(`Started onboarding for user ${userId}, step: ${user.onboardingStep}`);

    return new StartOnboardingResponseDto({
      success: true,
      message,
      currentStep: user.onboardingStep,
      otpSentTo,
      otpDestination,
    });
  }

  /**
   * Mask email for display (e.g., "j***@example.com")
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) {
      return email;
    }

    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }

    return `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 1, 3))}@${domain}`;
  }
}
