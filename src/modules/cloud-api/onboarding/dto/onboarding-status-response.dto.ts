import { User, AccountStatus, OnboardingStep } from '@/db/schema';

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

  constructor(partial: Partial<OnboardingStatusResponseDto>) {
    Object.assign(this, partial);
  }

  /**
   * Create from User model
   */
  static fromUser(
    user: User,
    onboardingToken?: string,
  ): OnboardingStatusResponseDto {
    return new OnboardingStatusResponseDto({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      currentStep: user.onboardingStep,
      onboardingComplete: user.onboardingComplete,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      onboardingToken,
    });
  }
}
