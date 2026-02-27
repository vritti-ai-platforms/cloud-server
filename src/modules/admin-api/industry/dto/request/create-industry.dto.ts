import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIndustryDto {
  @ApiProperty({ description: 'Display name of the industry', example: 'Technology' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'URL-friendly slug for the industry', example: 'technology' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ description: 'Short description of the industry', example: 'Software companies, SaaS, IT services & digital businesses' })
  @IsOptional()
  @IsString()
  description?: string;
}
