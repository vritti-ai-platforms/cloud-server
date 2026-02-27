import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIndustryDto {
  @ApiProperty({ description: 'Display name of the industry', example: 'Healthcare' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Unique code identifier for the industry', example: 'healthcare' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code: string;

  @ApiProperty({ description: 'URL-friendly slug for the industry', example: 'healthcare' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug: string;

  @ApiPropertyOptional({ description: 'Optional description of the industry', example: 'Healthcare and medical services' })
  @IsOptional()
  @IsString()
  description?: string;
}
