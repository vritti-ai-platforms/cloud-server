import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength } from 'class-validator';
import {
  type DeploymentStatus,
  type DeploymentType,
  DeploymentStatusValues,
  DeploymentTypeValues,
} from '@/db/schema';

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

  @ApiProperty({ description: 'Region UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  regionId: string;

  @ApiProperty({ description: 'Cloud provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  cloudProviderId: string;

  @ApiPropertyOptional({ enum: DeploymentStatusValues, default: 'Provisioning', description: 'Deployment status' })
  @IsOptional()
  @IsEnum(DeploymentStatusValues)
  status?: DeploymentStatus;

  @ApiProperty({ enum: DeploymentTypeValues, description: 'Deployment type' })
  @IsEnum(DeploymentTypeValues)
  type: DeploymentType;
}
