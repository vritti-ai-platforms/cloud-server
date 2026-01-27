import { ApiProperty } from '@nestjs/swagger';

export class BackupCodesResponseDto {
  @ApiProperty({
    description: 'Indicates whether the backup codes were generated successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human-readable message describing the result of the operation',
    example: 'Backup codes generated successfully. Store them securely.',
  })
  message: string;

  @ApiProperty({
    description: 'Array of one-time use backup codes for account recovery',
    example: ['ABC123DE', 'FGH456IJ', 'KLM789NO', 'PQR012ST', 'UVW345XY', 'ZAB678CD', 'EFG901HI', 'JKL234MN'],
    type: [String],
  })
  backupCodes: string[];

  @ApiProperty({
    description: 'Important warning message about storing backup codes securely',
    example:
      'These codes will only be shown once. Store them in a secure location. Each code can only be used once.',
  })
  warning: string;

  constructor(partial: Partial<BackupCodesResponseDto>) {
    Object.assign(this, partial);
  }
}
