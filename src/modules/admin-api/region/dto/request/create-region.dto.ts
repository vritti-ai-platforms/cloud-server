import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRegionDto {
  @ApiProperty({ description: 'Display name of the region', example: 'Hyderabad Metro' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Unique code identifier for the region', example: 'hyd-metro' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code: string;

  @ApiProperty({ description: 'Country of the region', example: 'India' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  country: string;

  @ApiProperty({ description: 'State of the region', example: 'Telangana' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  state: string;

  @ApiProperty({ description: 'City of the region', example: 'Hyderabad' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ description: 'Whether the region is active and available for deployments', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
