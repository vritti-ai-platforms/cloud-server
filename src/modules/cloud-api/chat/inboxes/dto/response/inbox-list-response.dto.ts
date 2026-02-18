import { ApiProperty } from '@nestjs/swagger';
import { InboxResponseDto } from '../entity/inbox-response.dto';

export class InboxListResponseDto {
  @ApiProperty({ type: [InboxResponseDto] })
  inboxes: InboxResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
