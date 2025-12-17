import { UserResponseDto } from '../../user/dto/user-response.dto';
import { OnboardingStep } from '@/generated/prisma/client';

export class AuthResponseDto {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number; // Access token expiry in seconds
  user: UserResponseDto;

  // Onboarding fields (optional - only present when user needs onboarding)
  requiresOnboarding?: boolean;
  onboardingToken?: string;
  onboardingStep?: OnboardingStep;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
