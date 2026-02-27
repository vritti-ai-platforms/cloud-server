import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Industry } from '@/db/schema';

export class IndustryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Technology' })
  name: string;

  @ApiProperty({ example: 'technology' })
  slug: string;

  @ApiPropertyOptional()
  description?: string | null;

  static from(industry: Industry): IndustryDto {
    const dto = new IndustryDto();
    dto.id = industry.id;
    dto.name = industry.name;
    dto.slug = industry.slug;
    dto.description = industry.description ?? null;
    return dto;
  }
}
