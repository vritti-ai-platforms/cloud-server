import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Industry } from '@/db/schema';

export class IndustryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Healthcare' })
  name: string;

  @ApiProperty({ example: 'healthcare' })
  code: string;

  @ApiProperty({ example: 'healthcare' })
  slug: string;

  @ApiPropertyOptional({ example: 'Healthcare and medical services', nullable: true })
  description: string | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  static from(industry: Industry): IndustryDto {
    const dto = new IndustryDto();
    dto.id = industry.id;
    dto.name = industry.name;
    dto.code = industry.code;
    dto.slug = industry.slug;
    dto.description = industry.description;
    dto.createdAt = industry.createdAt;
    dto.updatedAt = industry.updatedAt;
    return dto;
  }
}
