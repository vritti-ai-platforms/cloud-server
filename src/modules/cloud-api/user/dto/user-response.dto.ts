import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AccountStatus, OnboardingStep, User } from '@/db/schema';

export class UserResponseDto {
  @ApiProperty({ description: 'User unique identifier', example: 'usr_abc123xyz' })
  id: string;

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ description: 'User first name', example: 'John' })
  firstName?: string | null;

  @ApiPropertyOptional({ description: 'User last name', example: 'Doe' })
  lastName?: string | null;

  @ApiProperty({
    description: 'Account status',
    example: 'ACTIVE',
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
  })
  accountStatus: AccountStatus;

  @ApiProperty({ description: 'Whether email is verified', example: true })
  emailVerified: boolean;

  @ApiProperty({ description: 'Whether phone is verified', example: false })
  phoneVerified: boolean;

  @ApiProperty({
    description: 'Current onboarding step',
    example: 'COMPLETE',
    enum: ['EMAIL_VERIFICATION', 'PASSWORD_SETUP', 'PHONE_VERIFICATION', 'TWO_FACTOR_SETUP', 'COMPLETE'],
  })
  onboardingStep: OnboardingStep;

  @ApiProperty({ description: 'Whether user has set a password', example: true })
  hasPassword: boolean;

  @ApiPropertyOptional({ description: 'Phone number', example: '+14155551234' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Phone country code', example: 'US' })
  phoneCountry?: string | null;

  @ApiPropertyOptional({ description: 'Profile picture URL', example: 'https://example.com/avatar.jpg' })
  profilePictureUrl?: string | null;

  @ApiProperty({ description: 'User locale', example: 'en-US' })
  locale: string;

  @ApiProperty({ description: 'User timezone', example: 'America/Los_Angeles' })
  timezone: string;

  @ApiProperty({ description: 'Account creation timestamp', example: '2024-01-15T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Last login timestamp', example: '2024-01-15T10:30:00Z' })
  lastLoginAt?: Date | null;

  @ApiPropertyOptional({ description: 'Email verification timestamp', example: '2024-01-15T10:30:00Z' })
  emailVerifiedAt?: Date | null;

  @ApiPropertyOptional({ description: 'Phone verification timestamp', example: '2024-01-15T10:30:00Z' })
  phoneVerifiedAt?: Date | null;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }

  // Creates a response DTO from a User model
  static from(user: User): UserResponseDto {
    return new UserResponseDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      accountStatus: user.accountStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      onboardingStep: user.onboardingStep,
      hasPassword: user.passwordHash !== null,
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
