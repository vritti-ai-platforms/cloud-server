import type { OnboardingStep } from '@/db/schema';
import type { UserResponseDto } from '../../user/dto/user-response.dto';

/**
 * MFA method types available for verification
 */
export type MfaMethodType = 'totp' | 'sms' | 'passkey';

/**
 * MFA Challenge - returned when login requires multi-factor authentication
 */
export interface MfaChallengeInfo {
  sessionId: string;
  availableMethods: MfaMethodType[];
  defaultMethod: MfaMethodType;
  maskedPhone?: string; // e.g., "+1 *** *** 4567"
}

export class AuthResponseDto {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number; // Access token expiry in seconds
  user?: UserResponseDto;

  // Onboarding fields (optional - only present when user needs onboarding)
  requiresOnboarding?: boolean;
  onboardingToken?: string;
  onboardingStep?: OnboardingStep;

  // MFA fields (optional - only present when user has 2FA enabled)
  requiresMfa?: boolean;
  mfaChallenge?: MfaChallengeInfo;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
