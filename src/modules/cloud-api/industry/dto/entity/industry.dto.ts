import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Industry } from '@/db/schema';

export class IndustryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiPropertyOptional() description?: string | null;

  static from(industry: Industry): IndustryDto {
    const dto = new IndustryDto();
    dto.id = industry.id;
    dto.name = industry.name;
    dto.slug = industry.slug;
    dto.description = industry.description ?? null;
    return dto;
  }
}
