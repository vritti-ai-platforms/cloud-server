import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import type { AccountStatus, OnboardingStep } from '@/db/schema';
import { AccountStatusValues, OnboardingStepValues } from '@/db/schema';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  phoneCountry?: string;

  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @IsString()
  @IsOptional()
  locale?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsEnum(AccountStatusValues)
  @IsOptional()
  accountStatus?: AccountStatus;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  phoneVerified?: boolean;

  @IsEnum(OnboardingStepValues)
  @IsOptional()
  onboardingStep?: OnboardingStep;

  @IsBoolean()
  @IsOptional()
  onboardingComplete?: boolean;
}
