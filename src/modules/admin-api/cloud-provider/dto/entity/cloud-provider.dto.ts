import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CloudProvider } from '@/db/schema';

export class CloudProviderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'HealthCare Plus' })
  name: string;

  @ApiProperty({ example: 'healthcare-plus' })
  code: string;

  @ApiPropertyOptional({ example: 'https://cdn.vritti.io/providers/aws-light.svg', nullable: true })
  logoUrl: string | null;

  @ApiPropertyOptional({ example: 'https://cdn.vritti.io/providers/aws-dark.svg', nullable: true })
  logoDarkUrl: string | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ example: 3 })
  regionCount: number;

  @ApiProperty({ example: 12 })
  deploymentCount: number;

  @ApiProperty({ example: true, description: 'False when the provider has associated regions or deployments' })
  canDelete: boolean;

  static from(cloudProvider: CloudProvider, regionCount = 0, deploymentCount = 0): CloudProviderDto {
    const dto = new CloudProviderDto();
    dto.id = cloudProvider.id;
    dto.name = cloudProvider.name;
    dto.code = cloudProvider.code;
    dto.logoUrl = cloudProvider.logoUrl ?? null;
    dto.logoDarkUrl = cloudProvider.logoDarkUrl ?? null;
    dto.createdAt = cloudProvider.createdAt;
    dto.updatedAt = cloudProvider.updatedAt;
    dto.regionCount = regionCount;
    dto.deploymentCount = deploymentCount;
    dto.canDelete = regionCount === 0 && deploymentCount === 0;
    return dto;
  }
}
