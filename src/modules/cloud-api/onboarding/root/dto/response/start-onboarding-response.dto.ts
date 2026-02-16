import { ApiProperty } from '@nestjs/swagger';

export class StartOnboardingResponseDto {
  @ApiProperty({
    description: 'Indicates whether the onboarding start request was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human-readable message describing the result of the operation',
    example: 'Onboarding started successfully. OTP sent to your email.',
  })
  message: string;

  constructor(partial: Partial<StartOnboardingResponseDto>) {
    Object.assign(this, partial);
  }
}
