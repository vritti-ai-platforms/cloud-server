import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { IndustryDto } from '../entity/industry.dto';

export class IndustriesResponseDto {
  @ApiProperty({ type: [IndustryDto] })
  data: IndustryDto[];

  @ApiProperty({ description: 'Current active filter/sort/visibility state' })
  state: TableViewState;

  @ApiPropertyOptional()
  activeViewId: string | null;
}
