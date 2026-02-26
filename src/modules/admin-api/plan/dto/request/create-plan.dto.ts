import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ description: 'Display name of the plan', example: 'Pro' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Unique code identifier for the plan', example: 'pro' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code: string;

  @ApiPropertyOptional({ description: 'Display price for the plan', example: '$9/mo' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  price?: string;
}
