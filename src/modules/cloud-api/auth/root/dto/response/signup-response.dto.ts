import { ApiProperty } from '@nestjs/swagger';
import type { OnboardingStep } from '@/db/schema';
import type { UserDto } from '../../../../user/dto/entity/user.dto';

export class SignupResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;

  @ApiProperty({ example: true })
  isNewUser: boolean;

  @ApiProperty({ example: 'email', enum: ['email', 'oauth'] })
  signupMethod: 'email' | 'oauth';

  @ApiProperty({ example: 'EMAIL_VERIFICATION' })
  currentStep: OnboardingStep;

  constructor(partial: Partial<SignupResponseDto>) {
    Object.assign(this, partial);
  }

  // Builds signup response from user DTO and session tokens
  static from(
    user: UserDto,
    accessToken: string,
    expiresIn: number,
  ): SignupResponseDto {
    return new SignupResponseDto({
      accessToken,
      expiresIn,
      isNewUser: true,
      signupMethod: user.hasPassword ? 'email' : 'oauth',
      currentStep: user.onboardingStep,
    });
  }
}
