import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TableResponseDto, type TableViewState } from '@vritti/api-sdk';
import { PriceDetailDto } from '../entity/price-detail.dto';

export class PricesTableResponseDto extends TableResponseDto<PriceDetailDto> {
  @ApiProperty({ type: [PriceDetailDto] })
  declare result: PriceDetailDto[];

  @ApiProperty()
  declare count: number;

  @ApiProperty({ description: 'Current active filter/sort/visibility state' })
  declare state: TableViewState;

  @ApiPropertyOptional()
  declare activeViewId: string | null;
}
