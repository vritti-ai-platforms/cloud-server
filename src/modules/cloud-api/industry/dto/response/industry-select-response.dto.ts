import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class IndustrySelectOptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  value: string;

  @ApiProperty({ example: 'Technology' })
  label: string;

  @ApiPropertyOptional({ example: 'Software companies, SaaS, IT services & digital businesses' })
  description?: string;
}

export class IndustrySelectResponseDto {
  @ApiProperty({ type: [IndustrySelectOptionDto] })
  options: IndustrySelectOptionDto[];

  @ApiProperty({ example: false })
  hasMore: boolean;
}
