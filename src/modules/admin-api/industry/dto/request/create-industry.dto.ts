import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

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
}
