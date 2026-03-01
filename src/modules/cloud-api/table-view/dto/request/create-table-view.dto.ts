import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTableViewDto {
  @ApiProperty({ description: 'Display name for the saved view', example: 'AWS Only' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Unique slug identifying the table', example: 'cloud-providers' })
  @IsString()
  @MaxLength(100)
  tableSlug: string;

  @ApiProperty({ description: 'Full table view state including filters, sort, and column visibility' })
  @IsObject()
  state: TableViewState;

  @ApiPropertyOptional({ description: 'Whether this view is visible to all users', example: false })
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;
}
