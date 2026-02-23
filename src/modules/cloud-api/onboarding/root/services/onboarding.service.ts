import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues, SessionTypeValues } from '@/db/schema';
import { EncryptionService } from '../../../../../services';
import { SessionService } from '../../../auth/root/services/session.service';
import { UserService } from '../../../user/services/user.service';
import { OnboardingStatusResponseDto } from '../dto/entity/onboarding-status-response.dto';
import { StartOnboardingResponseDto } from '../dto/response/start-onboarding-response.dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
    private readonly sessionService: SessionService,
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

  // Validates onboarding is complete, then upgrades session to CLOUD and rotates tokens
  async completeSession(
    sessionId: string,
    userId: string,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const user = await this.userService.findById(userId);

    if (user.onboardingStep !== OnboardingStepValues.COMPLETE) {
      throw new BadRequestException({
        label: 'Onboarding Incomplete',
        detail: 'Please complete all onboarding steps before accessing the dashboard.',
      });
    }

    if (user.accountStatus !== AccountStatusValues.ACTIVE) {
      throw new BadRequestException({
        label: 'Account Not Active',
        detail: 'Your account is not active. Please complete onboarding first.',
      });
    }

    await this.sessionService.upgradeSession(sessionId, userId, SessionTypeValues.ONBOARDING, SessionTypeValues.CLOUD);
    return this.sessionService.refreshTokens(refreshToken);
  }
}
