import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Provider } from '@/db/schema';

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

  static from(provider: Provider, regionCount = 0): CloudProviderDto {
    const dto = new CloudProviderDto();
    dto.id = provider.id;
    dto.name = provider.name;
    dto.code = provider.code;
    dto.createdAt = provider.createdAt;
    dto.updatedAt = provider.updatedAt;
    dto.regionCount = regionCount;
    return dto;
  }
}
