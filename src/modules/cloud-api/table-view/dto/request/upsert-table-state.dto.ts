import { ApiProperty } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { IsObject, IsString, MaxLength } from 'class-validator';

export class UpsertTableStateDto {
  @ApiProperty({ description: 'Unique slug identifying the table', example: 'cloud-providers' })
  @IsString()
  @MaxLength(100)
  tableSlug: string;

  @ApiProperty({ description: 'Full table view state including filters, sort, and column visibility' })
  @IsObject()
  state: TableViewState;
}
