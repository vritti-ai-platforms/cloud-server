import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { OnboardingStepValues } from '@/db/schema';
import { EncryptionService } from '../../../../../services';
import { UserService } from '../../../user/services/user.service';
import { OnboardingStatusResponseDto } from '../dto/entity/onboarding-status-response.dto';
import { StartOnboardingResponseDto } from '../dto/response/start-onboarding-response.dto';
import { EmailVerificationService } from './email-verification.service';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // Fetches the user and maps their profile to an onboarding status response
  async getStatus(userId: string): Promise<OnboardingStatusResponseDto> {
    const userResponse = await this.userService.findById(userId);

    return OnboardingStatusResponseDto.fromUserDto(userResponse);
  }

  // Validates onboarding state, hashes the password, and advances to mobile verification
  async setPassword(userId: string, password: string): Promise<void> {
    const user = await this.userService.findById(userId);

    if (!user) {
      throw new BadRequestException("We couldn't find your account. Please check your information or register.");
    }

    if (user.onboardingStep !== OnboardingStepValues.SET_PASSWORD) {
      throw new BadRequestException(
        'You cannot set a password at this stage. Please complete the previous onboarding steps first.',
      );
    }

    if (user.hasPassword) {
      throw new BadRequestException(
        'Your account already has a password set. Please use the forgot password feature if you need to change it.',
      );
    }

    const passwordHash = await this.encryptionService.hashPassword(password);

    await this.userService.update(userId, {
      passwordHash,
      onboardingStep: OnboardingStepValues.MOBILE_VERIFICATION,
    });

    this.logger.log(`Password set for OAuth user: ${user.email} (${userId})`);
  }

  // Determines the current onboarding step and triggers relevant actions (e.g. send OTP)
  async startOnboarding(userId: string): Promise<StartOnboardingResponseDto> {
    const user = await this.userService.findById(userId);

    let otpSentTo: 'email' | 'phone' | null = null;
    let otpDestination: string | undefined;
    let message: string;

    switch (user.onboardingStep) {
      case OnboardingStepValues.EMAIL_VERIFICATION:
        if (!user.emailVerified) {
          await this.emailVerificationService.sendVerificationOtp(
            user.id,
            user.email,
            user.firstName,
          );
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
