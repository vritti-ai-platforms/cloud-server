import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { AccountStatus, OnboardingStep } from '@/generated/prisma/client';

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

  @IsEnum(AccountStatus)
  @IsOptional()
  accountStatus?: AccountStatus;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  phoneVerified?: boolean;

  @IsEnum(OnboardingStep)
  @IsOptional()
  onboardingStep?: OnboardingStep;

  @IsBoolean()
  @IsOptional()
  onboardingComplete?: boolean;
}
