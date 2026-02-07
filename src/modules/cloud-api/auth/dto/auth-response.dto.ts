import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OnboardingStep } from '@/db/schema';
import type { UserResponseDto } from '../../user/dto/user-response.dto';

/**
 * MFA method types available for verification
 */
export type MfaMethodType = 'totp' | 'sms' | 'passkey';

/**
 * MFA Challenge - returned when login requires multi-factor authentication
 */
export class MfaChallengeInfo {
  @ApiProperty({ description: 'MFA session ID', example: 'mfa_abc123xyz' })
  sessionId: string;

  @ApiProperty({
    description: 'Available MFA methods',
    example: ['totp', 'sms'],
    enum: ['totp', 'sms', 'passkey'],
    isArray: true,
  })
  availableMethods: MfaMethodType[];

  @ApiProperty({
    description: 'Default MFA method',
    example: 'totp',
    enum: ['totp', 'sms', 'passkey'],
  })
  defaultMethod: MfaMethodType;

  @ApiPropertyOptional({
    description: 'Masked phone number for SMS verification',
    example: '+1 *** *** 4567',
  })
  maskedPhone?: string;
}

export class AuthResponseDto {
  @ApiPropertyOptional({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Access token expiry in seconds',
    example: 3600,
  })
  expiresIn?: number;

  @ApiPropertyOptional({
    description: 'User information',
  })
  user?: UserResponseDto;

  @ApiPropertyOptional({
    description: 'Whether user requires onboarding',
    example: false,
  })
  requiresOnboarding?: boolean;

  @ApiPropertyOptional({
    description: 'Token for continuing onboarding flow',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  onboardingToken?: string;

  @ApiPropertyOptional({
    description: 'Current onboarding step',
    example: 'EMAIL_VERIFICATION',
    enum: ['EMAIL_VERIFICATION', 'PASSWORD_SETUP', 'PHONE_VERIFICATION', 'TWO_FACTOR_SETUP', 'COMPLETE'],
  })
  onboardingStep?: OnboardingStep;

  @ApiPropertyOptional({
    description: 'Whether MFA verification is required',
    example: true,
  })
  requiresMfa?: boolean;

  @ApiPropertyOptional({
    description: 'MFA challenge information',
    type: () => MfaChallengeInfo,
  })
  mfaChallenge?: MfaChallengeInfo;

  constructor(partial: Partial<AuthResponseDto>) {
    Object.assign(this, partial);
  }
}
