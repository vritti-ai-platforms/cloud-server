import { ApiProperty } from '@nestjs/swagger';

class PlanSelectOptionDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  value: string;

  @ApiProperty({ example: 'Starter' })
  label: string;
}

export class PlanSelectResponseDto {
  @ApiProperty({ type: [PlanSelectOptionDto] })
  options: PlanSelectOptionDto[];

  @ApiProperty({ example: false })
  hasMore: boolean;
}
