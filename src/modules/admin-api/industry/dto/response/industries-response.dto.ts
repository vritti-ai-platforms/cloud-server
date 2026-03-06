import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableResponseDto } from '@vritti/api-sdk';
import type { TableViewState } from '@vritti/api-sdk';
import { IndustryDto } from '../entity/industry.dto';

export class IndustryTableResponseDto extends TableResponseDto<IndustryDto> {
  @ApiProperty({ type: [IndustryDto] })
  declare result: IndustryDto[];

  @ApiProperty()
  declare count: number;

  @ApiProperty({ description: 'Current active filter/sort/visibility state' })
  declare state: TableViewState;

  @ApiPropertyOptional()
  declare activeViewId: string | null;
}
