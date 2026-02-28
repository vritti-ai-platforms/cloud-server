import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { CloudProvider } from '@/db/schema';

export class CloudProviderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'HealthCare Plus' })
  name: string;

  @ApiProperty({ example: 'healthcare-plus' })
  code: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ example: 3 })
  regionCount: number;

  static from(cloudProvider: CloudProvider, regionCount = 0): CloudProviderDto {
    const dto = new CloudProviderDto();
    dto.id = cloudProvider.id;
    dto.name = cloudProvider.name;
    dto.code = cloudProvider.code;
    dto.createdAt = cloudProvider.createdAt;
    dto.updatedAt = cloudProvider.updatedAt;
    dto.regionCount = regionCount;
    return dto;
  }
}
