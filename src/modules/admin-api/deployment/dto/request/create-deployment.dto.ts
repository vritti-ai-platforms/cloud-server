import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateDeploymentDto {
  @ApiProperty({ description: 'Display name of the deployment', example: 'US East Production' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Base URL of the api-nexus instance', example: 'https://nexus-us-east.vritti.io' })
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  nexusUrl: string;

  @ApiProperty({ description: 'Shared secret for webhook authentication', example: 'whsec_abc123...' })
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  webhookSecret: string;
}
