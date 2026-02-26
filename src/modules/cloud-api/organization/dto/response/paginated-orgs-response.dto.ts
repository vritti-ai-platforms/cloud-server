import { ApiProperty } from '@nestjs/swagger';
import { OrgListItemDto } from '../entity/organization.dto';

export class PaginatedOrgsResponseDto {
  // Paginated list of organizations
  @ApiProperty({ type: [OrgListItemDto] })
  result: OrgListItemDto[];

  @ApiProperty({ description: 'Total number of organizations', example: 42 })
  total: number;

  @ApiProperty({ description: 'Number of items skipped', example: 0 })
  offset: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Whether more pages exist', example: false })
  hasMore: boolean;
}
