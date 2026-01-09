import type { OnboardingStep } from '@/db/schema';

export class StartOnboardingResponseDto {
  success: boolean;
  message: string;
  currentStep: OnboardingStep;
  otpSentTo?: 'email' | 'phone' | null;
  otpDestination?: string; // masked email/phone

  constructor(partial: Partial<StartOnboardingResponseDto>) {
    Object.assign(this, partial);
  }
}
