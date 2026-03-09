import { ApiProperty } from '@nestjs/swagger';

class RegionSelectOptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  value: string;

  @ApiProperty({ example: 'US East (N. Virginia)' })
  label: string;
}

export class RegionSelectResponseDto {
  @ApiProperty({ type: [RegionSelectOptionDto] })
  options: RegionSelectOptionDto[];

  @ApiProperty({ example: false })
  hasMore: boolean;
}
