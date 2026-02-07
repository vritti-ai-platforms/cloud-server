import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { MfaMethod } from '../mfa-challenge.store';

/**
 * User information returned after successful MFA verification
 */
class MfaVerificationUserDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 'usr_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'Email address of the authenticated user',
    example: 'user@example.com',
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
}

/**
 * MFA Challenge response - returned when login requires MFA
 */
export class MfaChallengeDto {
  @ApiProperty({
    description: 'Unique session identifier for the MFA challenge. Use this in subsequent MFA verification requests.',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  sessionId: string;

  @ApiProperty({
    description: 'List of MFA methods available for the user to complete verification',
    example: ['totp', 'sms', 'passkey'],
    enum: ['totp', 'sms', 'passkey'],
    isArray: true,
  })
  availableMethods: MfaMethod[];

  @ApiProperty({
    description: 'The recommended default MFA method for verification. Priority order: TOTP > SMS > Passkey',
    example: 'totp',
    enum: ['totp', 'sms', 'passkey'],
  })
  defaultMethod: MfaMethod;

  @ApiPropertyOptional({
    description: 'Masked phone number for SMS OTP verification (only present if SMS is an available method)',
    example: '+1******7890',
  })
  maskedPhone?: string;

  constructor(partial: Partial<MfaChallengeDto>) {
    Object.assign(this, partial);
  }
}

/**
 * MFA verification success response
 */
export class MfaVerificationResponseDto {
  @ApiProperty({
    description: 'JWT access token for authenticating subsequent API requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Information about the authenticated user',
    type: MfaVerificationUserDto,
  })
  user: MfaVerificationUserDto;

  constructor(partial: Partial<MfaVerificationResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Passkey MFA start response
 */
export class PasskeyMfaOptionsDto<T = unknown> {
  @ApiProperty({
    description: 'WebAuthn authentication options to be passed to the browser credentials API (navigator.credentials.get)',
    example: {
      challenge: 'base64-encoded-challenge-string',
      timeout: 60000,
      rpId: 'example.com',
      allowCredentials: [
        {
          type: 'public-key',
          id: 'base64-encoded-credential-id',
        },
      ],
      userVerification: 'preferred',
    },
  })
  options: T;

  constructor(options: T) {
    this.options = options;
  }
}

/**
 * SMS OTP send response
 */
export class SmsOtpSentResponseDto {
  @ApiProperty({
    description: 'Indicates whether the SMS OTP was sent successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human-readable message about the SMS OTP status',
    example: 'Verification code sent successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Masked phone number where the OTP was sent',
    example: '+1******7890',
  })
  maskedPhone: string;

  constructor(partial: Partial<SmsOtpSentResponseDto>) {
    Object.assign(this, partial);
  }
}
