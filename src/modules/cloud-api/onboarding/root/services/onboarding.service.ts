import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { OnboardingStepValues } from '@/db/schema';
import { EncryptionService } from '../../../../../services';
import { UserService } from '../../../user/services/user.service';
import { OnboardingStatusResponseDto } from '../dto/entity/onboarding-status-response.dto';
import { StartOnboardingResponseDto } from '../dto/response/start-onboarding-response.dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
  ) {}

  // Fetches the user and maps their profile to an onboarding status response
  async getStatus(userId: string): Promise<OnboardingStatusResponseDto> {
    const userResponse = await this.userService.findById(userId);

    return OnboardingStatusResponseDto.fromUserDto(userResponse);
  }

  // Validates onboarding state, hashes the password, and advances to mobile verification
  async setPassword(userId: string, password: string): Promise<StartOnboardingResponseDto> {
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

    return new StartOnboardingResponseDto({
      success: true,
      message: 'Password set successfully',
    });
  }
}
