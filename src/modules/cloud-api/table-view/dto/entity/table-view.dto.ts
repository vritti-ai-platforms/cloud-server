import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { TableViewState } from '@vritti/api-sdk';
import type { TableView } from '@/db/schema';

export class TableViewDto {
  @ApiProperty({ description: 'View unique identifier' })
  id: string;

  @ApiPropertyOptional({ description: 'Display name of the view — null for the auto-saved live state row', nullable: true })
  name: string | null;

  @ApiProperty({ description: 'Slug of the table this view belongs to', example: 'cloud-providers' })
  tableSlug: string;

  @ApiProperty({ description: 'Stored filter, sort, and column visibility state' })
  state: TableViewState;

  @ApiProperty({ description: 'Whether the view is visible to all users', example: false })
  isShared: boolean;

  @ApiProperty({ description: 'Whether this row represents the auto-saved live state', example: false })
  isCurrent: boolean;

  @ApiProperty({ description: 'Whether the requesting user owns this view', example: true })
  isOwn: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Last updated timestamp', nullable: true })
  updatedAt: Date | null;

  // Creates a response DTO from a TableView entity
  static from(view: TableView, userId: string): TableViewDto {
    const dto = new TableViewDto();
    dto.id = view.id;
    dto.name = view.name ?? null;
    dto.tableSlug = view.tableSlug;
    dto.state = view.state;
    dto.isShared = view.isShared;
    dto.isCurrent = view.isCurrent;
    dto.isOwn = view.userId === userId;
    dto.createdAt = view.createdAt;
    dto.updatedAt = view.updatedAt ?? null;
    return dto;
  }
}
