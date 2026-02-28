import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrganizationSelectOptionDto {
  @ApiProperty({ example: 'acme-corp', oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }] })
  value: string | number | boolean;

  @ApiProperty({ example: 'Acme Corporation' })
  label: string;

  @ApiPropertyOptional({ example: 'free' })
  description?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000', oneOf: [{ type: 'string' }, { type: 'number' }] })
  groupId?: string | number;
}

class OrganizationSelectGroupDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', oneOf: [{ type: 'string' }, { type: 'number' }] })
  id: string | number;

  @ApiProperty({ example: 'free' })
  name: string;
}

export class OrganizationSelectResponseDto {
  @ApiProperty({ type: [OrganizationSelectOptionDto] })
  options: OrganizationSelectOptionDto[];

  @ApiPropertyOptional({ type: [OrganizationSelectGroupDto] })
  groups?: OrganizationSelectGroupDto[];

  @ApiProperty({ example: false })
  hasMore: boolean;

  @ApiPropertyOptional({ example: 5 })
  totalCount?: number;
}
