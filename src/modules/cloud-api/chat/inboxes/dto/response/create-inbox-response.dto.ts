import { ApiProperty } from '@nestjs/swagger';
import { InboxResponseDto } from '../entity/inbox-response.dto';

export class CreateInboxResponseDto {
  @ApiProperty({ type: InboxResponseDto })
  inbox: InboxResponseDto;

  @ApiProperty({ example: 'Inbox created successfully.' })
  message: string;
}
