import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Provider } from '@/db/schema';

export class ProviderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'HealthCare Plus' })
  name: string;

  @ApiProperty({ example: 'healthcare-plus' })
  code: string;

  @ApiProperty({ example: 'Hyderabad' })
  city: string;

  @ApiProperty({ example: 'Telangana' })
  state: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  static from(provider: Provider): ProviderDto {
    const dto = new ProviderDto();
    dto.id = provider.id;
    dto.name = provider.name;
    dto.code = provider.code;
    dto.city = provider.city;
    dto.state = provider.state;
    dto.createdAt = provider.createdAt;
    dto.updatedAt = provider.updatedAt;
    return dto;
  }
}
