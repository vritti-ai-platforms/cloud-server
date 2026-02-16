import { ApiProperty } from '@nestjs/swagger';
import type { OnboardingStep, User } from '@/db/schema';
import { OnboardingStepValues } from '@/db/schema';
import type { UserDto } from '../../../../user/dto/entity/user.dto';

export class OnboardingStatusResponseDto {
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;

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
    description: 'Method used for signup - email for manual signup with password, oauth for OAuth providers',
    example: 'email',
    enum: ['email', 'oauth'],
  })
  signupMethod: 'email' | 'oauth';

  constructor(partial: Partial<OnboardingStatusResponseDto>) {
    Object.assign(this, partial);
  }

  // Builds onboarding status from User entity
  static fromUser(user: User): OnboardingStatusResponseDto {
    const signupMethod: 'email' | 'oauth' = user.passwordHash === null ? 'oauth' : 'email';

    return new OnboardingStatusResponseDto({
      email: user.email,
      currentStep: user.onboardingStep,
      onboardingComplete: user.onboardingStep === OnboardingStepValues.COMPLETE,
      signupMethod,
    });
  }

  // Builds onboarding status from UserDto
  static fromUserDto(userResponse: UserDto): OnboardingStatusResponseDto {
    const signupMethod: 'email' | 'oauth' = userResponse.hasPassword ? 'email' : 'oauth';

    return new OnboardingStatusResponseDto({
      email: userResponse.email,
      currentStep: userResponse.onboardingStep,
      onboardingComplete: userResponse.onboardingStep === OnboardingStepValues.COMPLETE,
      signupMethod,
    });
  }
}
