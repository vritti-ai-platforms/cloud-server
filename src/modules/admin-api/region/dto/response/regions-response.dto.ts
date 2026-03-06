import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { TableResponseDto } from '@vritti/api-sdk';
import { RegionDto } from '../entity/region.dto';

export class RegionTableResponseDto extends TableResponseDto<RegionDto> {
  @ApiProperty({ type: [RegionDto] })
  declare result: RegionDto[];

  @ApiProperty()
  declare count: number;

  @ApiProperty({ description: 'Current active filter/sort/visibility state' })
  declare state: TableViewState;

  @ApiPropertyOptional()
  declare activeViewId: string | null;
}
