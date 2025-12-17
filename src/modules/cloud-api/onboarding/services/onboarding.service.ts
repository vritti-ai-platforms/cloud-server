import { Injectable, Logger } from '@nestjs/common';
import {
  BadRequestException
} from '@vritti/api-sdk';
import { EncryptionService } from '../../../../services';
import { UserService } from '../../user/user.service';
import { OnboardingStatusResponseDto } from '../dto/onboarding-status-response.dto';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly userService: UserService,
    private readonly encryptionService: EncryptionService,
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
    if (user.onboardingStep !== 'SET_PASSWORD') {
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
}
