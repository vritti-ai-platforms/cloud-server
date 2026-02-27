import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

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
}
