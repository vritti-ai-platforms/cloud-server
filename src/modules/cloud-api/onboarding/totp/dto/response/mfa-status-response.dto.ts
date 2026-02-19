import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MfaMethod } from '@/db/schema';

export class MfaStatusResponseDto {
  @ApiProperty({
    description: 'Indicates whether multi-factor authentication is enabled for the user',
    example: true,
  })
  isEnabled: boolean;

  @ApiPropertyOptional({
    description: 'The multi-factor authentication method configured by the user',
    example: 'TOTP',
    enum: ['TOTP', 'PASSKEY', 'SMS', 'EMAIL'],
    nullable: true,
  })
  method: MfaMethod | null;

  @ApiProperty({
    description: 'Number of unused backup codes remaining for account recovery',
    example: 8,
  })
  backupCodesRemaining: number;

  @ApiPropertyOptional({
    description: 'Timestamp when multi-factor authentication was last used',
    example: '2024-01-15T10:30:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  lastUsedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp when multi-factor authentication was initially configured',
    example: '2024-01-01T08:00:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  createdAt: Date | null;

  constructor(partial: Partial<MfaStatusResponseDto>) {
    Object.assign(this, partial);
  }
}
