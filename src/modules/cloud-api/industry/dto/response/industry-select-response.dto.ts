import { ApiProperty } from '@nestjs/swagger';

class IndustrySelectOptionDto {
  @ApiProperty({ example: 1 })
  value: number;

  @ApiProperty({ example: 'Technology' })
  label: string;
}

export class IndustrySelectResponseDto {
  @ApiProperty({ type: [IndustrySelectOptionDto] })
  options: IndustrySelectOptionDto[];

  @ApiProperty({ example: false })
  hasMore: boolean;
}
