import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import type { AccountStatus, OnboardingStep } from '@/db/schema';
import { AccountStatusValues, OnboardingStepValues } from '@/db/schema';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'The first name of the user',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'The last name of the user',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'The phone number of the user',
    example: '+14155552671',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: 'The ISO country code for the phone number',
    example: 'US',
  })
  @IsString()
  @IsOptional()
  phoneCountry?: string;

  @ApiPropertyOptional({
    description: 'URL to the user profile picture',
    example: 'https://cdn.example.com/avatars/user-123.jpg',
  })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiPropertyOptional({
    description: 'The locale/language preference of the user',
    example: 'en-US',
  })
  @IsString()
  @IsOptional()
  locale?: string;

  @ApiPropertyOptional({
    description: 'The timezone preference of the user',
    example: 'America/New_York',
  })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'The current account status of the user',
    example: 'ACTIVE',
    enum: Object.values(AccountStatusValues),
  })
  @IsEnum(AccountStatusValues)
  @IsOptional()
  accountStatus?: AccountStatus;

  @ApiPropertyOptional({
    description: 'Whether the user email has been verified',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user phone number has been verified',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  phoneVerified?: boolean;

  @ApiPropertyOptional({
    description: 'The current step in the user onboarding process',
    example: 'COMPLETE',
    enum: Object.values(OnboardingStepValues),
  })
  @IsEnum(OnboardingStepValues)
  @IsOptional()
  onboardingStep?: OnboardingStep;

  @ApiPropertyOptional({
    description: 'The hashed password for direct password updates (use with caution)',
    example: '$2b$10$...',
  })
  @IsString()
  @IsOptional()
  passwordHash?: string;
}
