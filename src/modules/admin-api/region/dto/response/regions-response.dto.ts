import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { RegionDto } from '../entity/region.dto';

export class RegionsResponseDto {
  @ApiProperty({ type: [RegionDto] })
  data: RegionDto[];

  @ApiProperty({ description: 'Current active filter/sort/visibility state' })
  state: TableViewState;

  @ApiPropertyOptional()
  activeViewId: string | null;
}
