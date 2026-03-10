import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Deployment } from '@/db/schema';
import { type DeploymentStatus, DeploymentStatusValues, type DeploymentType, DeploymentTypeValues } from '@/db/schema';
import type { DeploymentWithNames } from '../../repositories/deployment.repository';

export class DeploymentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'US East Production' })
  name: string;

  @ApiProperty({ example: 'https://nexus-us-east.vritti.io' })
  nexusUrl: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  regionId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  cloudProviderId: string;

  @ApiProperty({ enum: DeploymentStatusValues })
  status: DeploymentStatus;

  @ApiProperty({ enum: DeploymentTypeValues })
  type: DeploymentType;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  @ApiPropertyOptional({ example: 'US East' })
  regionName?: string;

  @ApiPropertyOptional({ example: 'us-east' })
  regionCode?: string;

  @ApiPropertyOptional({ example: 'Amazon Web Services' })
  cloudProviderName?: string;

  @ApiPropertyOptional({ example: 'aws' })
  cloudProviderCode?: string;

  @ApiProperty({ example: 0 })
  organizationCount: number;

  // Strips webhookSecret from the response for security
  static from(deployment: Deployment | DeploymentWithNames, organizationCount = 0): DeploymentDto {
    const dto = new DeploymentDto();
    dto.id = deployment.id;
    dto.name = deployment.name;
    dto.nexusUrl = deployment.nexusUrl;
    dto.regionId = deployment.regionId;
    dto.cloudProviderId = deployment.cloudProviderId;
    dto.status = deployment.status;
    dto.type = deployment.type;
    dto.createdAt = deployment.createdAt;
    dto.updatedAt = deployment.updatedAt;
    dto.organizationCount = organizationCount;
    if ('region' in deployment && deployment.region) {
      const withNames = deployment as DeploymentWithNames;
      dto.regionName = withNames.region.name;
      dto.regionCode = withNames.region.code;
      dto.cloudProviderName = withNames.cloudProvider.name;
      dto.cloudProviderCode = withNames.cloudProvider.code;
    }
    return dto;
  }
}
