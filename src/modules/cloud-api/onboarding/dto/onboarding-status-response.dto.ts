import type { AccountStatus, OnboardingStep, User } from '@/db/schema';

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
  static fromUser(user: User, onboardingToken?: string, isNewUser: boolean = false): OnboardingStatusResponseDto {
    // Determine signup method: 'oauth' if no password hash, 'email' otherwise
    const signupMethod: 'email' | 'oauth' = user.passwordHash === null ? 'oauth' : 'email';

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
      isNewUser,
      signupMethod,
    });
  }
}
