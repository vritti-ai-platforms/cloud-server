import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TwoFactorMethod } from '@/db/schema';

export class TwoFactorStatusResponseDto {
  @ApiProperty({
    description: 'Indicates whether two-factor authentication is enabled for the user',
    example: true,
  })
  isEnabled: boolean;

  @ApiPropertyOptional({
    description: 'The two-factor authentication method configured by the user',
    example: 'TOTP',
    enum: ['TOTP', 'PASSKEY', 'SMS', 'EMAIL'],
    nullable: true,
  })
  method: TwoFactorMethod | null;

  @ApiProperty({
    description: 'Number of unused backup codes remaining for account recovery',
    example: 8,
  })
  backupCodesRemaining: number;

  @ApiPropertyOptional({
    description: 'Timestamp when two-factor authentication was last used',
    example: '2024-01-15T10:30:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  lastUsedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Timestamp when two-factor authentication was initially configured',
    example: '2024-01-01T08:00:00.000Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  createdAt: Date | null;

  constructor(partial: Partial<TwoFactorStatusResponseDto>) {
    Object.assign(this, partial);
  }
}
