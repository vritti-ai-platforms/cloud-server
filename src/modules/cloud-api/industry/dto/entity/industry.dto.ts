import { ApiProperty } from '@nestjs/swagger';
import type { Industry } from '@/db/schema';

export class IndustryDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;

  static from(industry: Industry): IndustryDto {
    const dto = new IndustryDto();
    dto.id = industry.id;
    dto.name = industry.name;
    dto.slug = industry.slug;
    return dto;
  }
}
