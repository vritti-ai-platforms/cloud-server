import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Region } from '@/db/schema';

export class RegionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Hyderabad Metro' })
  name: string;

  @ApiProperty({ example: 'hyd-metro' })
  code: string;

  @ApiProperty({ example: 'Telangana' })
  state: string;

  @ApiProperty({ example: 'Hyderabad' })
  city: string;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  static from(region: Region): RegionDto {
    const dto = new RegionDto();
    dto.id = region.id;
    dto.name = region.name;
    dto.code = region.code;
    dto.state = region.state;
    dto.city = region.city;
    dto.createdAt = region.createdAt;
    dto.updatedAt = region.updatedAt;
    return dto;
  }
}
