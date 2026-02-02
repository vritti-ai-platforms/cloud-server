import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MinLength, MaxLength } from 'class-validator';
import {
  IndustryTypeValues,
  CompanySizeValues,
  type IndustryType,
  type CompanySize,
} from '@/db/schema';

export class UpdateCompanyDto {
  @ApiPropertyOptional({
    description: 'Industry type',
    enum: IndustryTypeValues,
    example: 'HEALTHCARE',
  })
  @IsEnum(IndustryTypeValues)
  @IsOptional()
  industry?: IndustryType;

  @ApiPropertyOptional({
    description: 'Company size',
    enum: CompanySizeValues,
    example: 'SIZE_11_50',
  })
  @IsEnum(CompanySizeValues)
  @IsOptional()
  size?: CompanySize;

  @ApiPropertyOptional({
    description: 'Company logo URL',
    example: 'https://example.com/logo.png',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Timezone',
    example: 'Asia/Kolkata',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'INR',
    maxLength: 3,
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(3)
  currency?: string;
}
