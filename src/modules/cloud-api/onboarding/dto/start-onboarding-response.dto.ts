import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { OnboardingStep } from '@/db/schema';

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

  @ApiProperty({
    description: 'Current step in the onboarding process',
    example: 'EMAIL_VERIFICATION',
    enum: ['PENDING', 'EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'TWO_FACTOR_SETUP', 'COMPLETE'],
  })
  currentStep: OnboardingStep;

  @ApiPropertyOptional({
    description: 'Channel through which the OTP was sent',
    example: 'email',
    enum: ['email', 'phone'],
    nullable: true,
  })
  otpSentTo?: 'email' | 'phone' | null;

  @ApiPropertyOptional({
    description: 'Masked destination where OTP was sent (e.g., masked email or phone number)',
    example: 'j***@example.com',
  })
  otpDestination?: string;

  constructor(partial: Partial<StartOnboardingResponseDto>) {
    Object.assign(this, partial);
  }
}
