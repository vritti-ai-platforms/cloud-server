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

  constructor(partial: Partial<Skip2FAResponseDto>) {
    Object.assign(this, partial);
  }
}
