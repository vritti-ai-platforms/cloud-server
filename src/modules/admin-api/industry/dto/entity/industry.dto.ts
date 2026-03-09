import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Industry } from '@/db/schema';

export class IndustryDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Healthcare' })
  name: string;

  @ApiProperty({ example: 'healthcare' })
  code: string;

  @ApiPropertyOptional({ example: 'Healthcare and medical services', nullable: true })
  description: string | null;

  @ApiProperty({ type: 'string', format: 'date-time' })
  createdAt: Date;

  @ApiPropertyOptional({ type: 'string', format: 'date-time', nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ example: true, description: 'False when the industry is referenced by organizations, prices, or deployment plans' })
  canDelete: boolean;

  static from(industry: Industry, canDelete = true): IndustryDto {
    const dto = new IndustryDto();
    dto.id = industry.id;
    dto.name = industry.name;
    dto.code = industry.code;
    dto.description = industry.description;
    dto.createdAt = industry.createdAt;
    dto.updatedAt = industry.updatedAt;
    dto.canDelete = canDelete;
    return dto;
  }
}
