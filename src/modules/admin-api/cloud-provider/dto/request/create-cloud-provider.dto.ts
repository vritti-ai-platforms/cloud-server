import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateCloudProviderDto {
  @ApiProperty({ description: 'Display name of the provider', example: 'Amazon Web Services' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Unique code identifier for the provider', example: 'AWS' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code: string;

  @ApiPropertyOptional({ description: 'URL to the provider logo for light mode', example: 'https://cdn.vritti.io/providers/aws-light.svg' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'URL to the provider logo for dark mode', example: 'https://cdn.vritti.io/providers/aws-dark.svg' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoDarkUrl?: string;

}
