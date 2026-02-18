import { ApiProperty } from '@nestjs/swagger';
import { InboxResponseDto } from '../entity/inbox-response.dto';

export class WhatsAppEmbeddedSignupResponseDto {
  @ApiProperty({ type: InboxResponseDto })
  inbox: InboxResponseDto;

  @ApiProperty({ example: 'WhatsApp inbox connected successfully.' })
  message: string;
}
