import { ApiProperty } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { CloudProviderDto } from '../entity/cloud-provider.dto';

export class CloudProvidersResponseDto {
  @ApiProperty({ type: [CloudProviderDto] })
  data: CloudProviderDto[];

  @ApiProperty({ description: 'Current active filter/sort/visibility state' })
  state: TableViewState;
}
