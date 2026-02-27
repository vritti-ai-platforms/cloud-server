import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class OrganizationSelectOptionDto {
  @ApiProperty({ example: 'acme-corp' })
  value: string;

  @ApiProperty({ example: 'Acme Corporation' })
  label: string;

  @ApiPropertyOptional({ example: 'A leading technology company' })
  description?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  groupId?: string;
}

class OrganizationSelectGroupDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

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
}
