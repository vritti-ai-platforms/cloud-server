import type { OnboardingStep } from '@/db/schema';
import type { UserResponseDto } from '../../user/dto/user-response.dto';

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
