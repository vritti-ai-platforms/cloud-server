import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { OnboardingStepValues } from '@/db/schema';
import { EncryptionService } from '../../../../../services';
import { UserService } from '../../../user/services/user.service';
import { EmailVerificationService } from '../../email-verification/services/email-verification.service';
import { OnboardingStatusResponseDto } from '../dto/entity/onboarding-status-response.dto';
import { StartOnboardingResponseDto } from '../dto/response/start-onboarding-response.dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  // Starts onboarding flow - only EMAIL_VERIFICATION (email/password signup) or SET_PASSWORD (OAuth signup) are valid entry points
  async startOnboarding(userId: string): Promise<StartOnboardingResponseDto> {
    const user = await this.userService.findById(userId);
    console.log('User onboarding step:', user);

    switch (user.onboardingStep) {
      case OnboardingStepValues.EMAIL_VERIFICATION:
        if (!user.emailVerified) {
          await this.emailVerificationService.sendVerificationOtp(user.id, user.email, user.displayName);
          this.logger.log(`Started onboarding for user ${userId}, step: ${user.onboardingStep}`);
          return new StartOnboardingResponseDto({
            success: true,
            message: 'Verification code sent to your email',
          });
        }

        this.logger.log(`Started onboarding for user ${userId}, step: ${user.onboardingStep}`);
        return new StartOnboardingResponseDto({
          success: true,
          message: 'Email already verified',
        });

      case OnboardingStepValues.SET_PASSWORD:
        this.logger.log(`Started onboarding for user ${userId}, step: ${user.onboardingStep}`);
        return new StartOnboardingResponseDto({
          success: true,
          message: 'Please set your password',
        });

      case OnboardingStepValues.COMPLETE:
        this.logger.log(`Started onboarding for user ${userId}, step: ${user.onboardingStep}`);
        return new StartOnboardingResponseDto({
          success: true,
          message: 'Onboarding already complete',
        });

      default:
        // MOBILE_VERIFICATION and TWO_FACTOR_SETUP are unreachable after blocking incomplete account logins
        throw new BadRequestException({
          label: 'Invalid Onboarding State',
          detail: 'This account is in an invalid state. Please sign up again to complete your registration.',
        });
    }
  }

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
}
