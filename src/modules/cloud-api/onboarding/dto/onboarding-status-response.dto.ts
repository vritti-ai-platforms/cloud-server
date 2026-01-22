import type { AccountStatus, OnboardingStep, User } from '@/db/schema';
import { OnboardingStepValues } from '@/db/schema';
import type { UserResponseDto } from '../../user/dto/user-response.dto';

export class OnboardingStatusResponseDto {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;

  // Onboarding progress
  currentStep: OnboardingStep;
  onboardingComplete: boolean;
  accountStatus: AccountStatus;

  // Verification status
  emailVerified: boolean;
  phoneVerified: boolean;

  // Token for continuing onboarding
  onboardingToken?: string;

  // Whether this is a newly created account (vs resuming)
  isNewUser: boolean;

  // Signup method used: 'email' for manual signup, 'oauth' for OAuth
  signupMethod: 'email' | 'oauth';

  constructor(partial: Partial<OnboardingStatusResponseDto>) {
    Object.assign(this, partial);
  }

  /**
   * Create from User model
   */
  static fromUser(user: User, isNewUser: boolean = false): OnboardingStatusResponseDto {
    // Determine signup method: 'oauth' if no password hash, 'email' otherwise
    const signupMethod: 'email' | 'oauth' = user.passwordHash === null ? 'oauth' : 'email';

    return new OnboardingStatusResponseDto({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      currentStep: 'TWO_FACTOR_SETUP',
      onboardingComplete: user.onboardingStep === OnboardingStepValues.COMPLETE,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      isNewUser,
      signupMethod,
    });
  }

  /**
   * Create from UserResponseDto
   * Optimized version that avoids redundant DB queries by using UserResponseDto directly
   */
  static fromUserResponseDto(userResponse: UserResponseDto, isNewUser: boolean = false): OnboardingStatusResponseDto {
    // Determine signup method: 'oauth' if no password, 'email' otherwise
    const signupMethod: 'email' | 'oauth' = userResponse.hasPassword ? 'email' : 'oauth';

    return new OnboardingStatusResponseDto({
      userId: userResponse.id,
      email: userResponse.email,
      firstName: userResponse.firstName,
      lastName: userResponse.lastName,
      currentStep: "TWO_FACTOR_SETUP",
      onboardingComplete: userResponse.onboardingStep === OnboardingStepValues.COMPLETE,
      accountStatus: userResponse.accountStatus,
      emailVerified: userResponse.emailVerified,
      phoneVerified: userResponse.phoneVerified,
      isNewUser,
      signupMethod,
    });
  }
}
