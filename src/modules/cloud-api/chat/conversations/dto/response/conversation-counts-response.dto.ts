import { ApiProperty } from '@nestjs/swagger';

export class ConversationCountsResponseDto {
  @ApiProperty({ example: 42 })
  all: number;

  @ApiProperty({ example: 15 })
  open: number;

  @ApiProperty({ example: 20 })
  resolved: number;

  @ApiProperty({ example: 5 })
  pending: number;

  @ApiProperty({ example: 2 })
  snoozed: number;
}
