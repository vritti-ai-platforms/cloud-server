import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { TableResponseDto } from '@vritti/api-sdk';
import { CloudProviderDto } from '../entity/cloud-provider.dto';

export class CloudProviderTableResponseDto extends TableResponseDto<CloudProviderDto> {
  @ApiProperty({ type: [CloudProviderDto] })
  declare result: CloudProviderDto[];

  @ApiProperty()
  declare count: number;

  @ApiProperty({ description: 'Current active filter/sort/visibility state' })
  declare state: TableViewState;

  @ApiPropertyOptional()
  declare activeViewId: string | null;
}
