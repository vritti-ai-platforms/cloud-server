import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateProviderDto {
  @ApiProperty({ description: 'Display name of the provider', example: 'HealthCare Plus' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Unique code identifier for the provider', example: 'healthcare-plus' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code: string;

  @ApiProperty({ description: 'City where the provider is located', example: 'Hyderabad' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'State where the provider is located', example: 'Telangana' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  state: string;
}
