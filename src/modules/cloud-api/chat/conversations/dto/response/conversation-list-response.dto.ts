import { ApiProperty } from '@nestjs/swagger';
import { ConversationResponseDto } from '../entity/conversation-response.dto';

export class ConversationListResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  conversations: ConversationResponseDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}
