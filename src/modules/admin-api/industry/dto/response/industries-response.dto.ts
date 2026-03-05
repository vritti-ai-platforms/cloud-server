import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { IndustryDto } from '../entity/industry.dto';

export class IndustriesResponseDto {
  @ApiProperty({ type: [IndustryDto] })
  result: IndustryDto[];

  @ApiProperty()
  count: number;

  @ApiProperty({ description: 'Current active filter/sort/visibility state' })
  state: TableViewState;

  @ApiPropertyOptional()
  activeViewId: string | null;
}
