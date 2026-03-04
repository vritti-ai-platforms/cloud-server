import { ApiProperty } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { IsObject } from 'class-validator';

// State-only update — name, tableSlug, and isShared are not updatable via this DTO
export class UpdateTableViewDto {
  @ApiProperty({ description: 'Updated filter, sort, and column visibility state' })
  @IsObject()
  state: TableViewState;
}
