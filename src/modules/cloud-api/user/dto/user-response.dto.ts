import { AccountStatus, OnboardingStep } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;

  // Account status
  accountStatus: AccountStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  onboardingStep: OnboardingStep;
  onboardingComplete: boolean;

  // Phone number
  phone?: string | null;
  phoneCountry?: string | null;

  // Profile
  profilePictureUrl?: string | null;
  locale: string;
  timezone: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  /**
   * Create from Prisma User model
   * @param user - User model from Prisma
   * @returns UserResponseDto without sensitive data (passwordHash excluded)
   */
  static fromPrisma(user: any): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      onboardingStep: user.onboardingStep,
      onboardingComplete: user.onboardingComplete,
      phone: user.phone,
      phoneCountry: user.phoneCountry,
      profilePictureUrl: user.profilePictureUrl,
      locale: user.locale,
      timezone: user.timezone,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
    });
  }
}
