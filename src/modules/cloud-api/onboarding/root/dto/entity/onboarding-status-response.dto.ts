import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AccountStatus, OnboardingStep, User } from '@/db/schema';
import { OnboardingStepValues } from '@/db/schema';
import type { UserDto } from '../../../../user/dto/entity/user.dto';

export class OnboardingStatusResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
    example: 'usr_abc123def456',
  })
  userId: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'John',
    nullable: true,
  })
  firstName?: string | null;

  @ApiPropertyOptional({
    description: 'Last name of the user',
    example: 'Doe',
    nullable: true,
  })
  lastName?: string | null;

  @ApiProperty({
    description: 'Current step in the onboarding process',
    example: 'EMAIL_VERIFICATION',
    enum: ['PENDING', 'EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'TWO_FACTOR_SETUP', 'COMPLETE'],
  })
  currentStep: OnboardingStep;

  @ApiProperty({
    description: 'Indicates whether the user has completed the entire onboarding process',
    example: false,
  })
  onboardingComplete: boolean;

  @ApiProperty({
    description: 'Current status of the user account',
    example: 'ACTIVE',
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
  })
  accountStatus: AccountStatus;

  @ApiProperty({
    description: 'Indicates whether the user email address has been verified',
    example: true,
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Indicates whether the user phone number has been verified',
    example: false,
  })
  phoneVerified: boolean;

  @ApiPropertyOptional({
    description: 'JWT token for continuing the onboarding process in subsequent requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  onboardingToken?: string;

  @ApiProperty({
    description: 'Indicates whether this is a newly created account or a user resuming onboarding',
    example: true,
  })
  isNewUser: boolean;

  @ApiProperty({
    description: 'Method used for signup - email for manual signup with password, oauth for OAuth providers',
    example: 'email',
    enum: ['email', 'oauth'],
  })
  signupMethod: 'email' | 'oauth';

  constructor(partial: Partial<OnboardingStatusResponseDto>) {
    Object.assign(this, partial);
  }

  static fromUser(user: User, isNewUser: boolean = false): OnboardingStatusResponseDto {
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

  static fromUserDto(userResponse: UserDto, isNewUser: boolean = false): OnboardingStatusResponseDto {
    const signupMethod: 'email' | 'oauth' = userResponse.hasPassword ? 'email' : 'oauth';

    return new OnboardingStatusResponseDto({
      userId: userResponse.id,
      email: userResponse.email,
      firstName: userResponse.firstName,
      lastName: userResponse.lastName,
      currentStep: userResponse.onboardingStep,
      onboardingComplete: userResponse.onboardingStep === OnboardingStepValues.COMPLETE,
      accountStatus: userResponse.accountStatus,
      emailVerified: userResponse.emailVerified,
      phoneVerified: userResponse.phoneVerified,
      isNewUser,
      signupMethod,
    });
  }
}
