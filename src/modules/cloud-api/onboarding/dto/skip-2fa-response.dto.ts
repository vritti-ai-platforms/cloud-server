import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for skipping 2FA setup
 */
export class Skip2FAResponseDto {
  @ApiProperty({
    description: 'Indicates whether 2FA was skipped successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human-readable message describing the result',
    example: 'Two-factor authentication setup skipped. You can enable it later in settings.',
  })
  message: string;

  @ApiProperty({
    description: 'JWT access token for API requests (returned after onboarding completion)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  accessToken?: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 900,
    required: false,
  })
  expiresIn?: number;

  @ApiProperty({
    description: 'Type of the token (always "Bearer")',
    example: 'Bearer',
    required: false,
  })
  tokenType?: string;

  constructor(partial: Partial<Skip2FAResponseDto>) {
    Object.assign(this, partial);
  }
}
