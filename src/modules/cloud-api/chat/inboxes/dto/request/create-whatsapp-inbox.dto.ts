import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWhatsAppInboxDto {
  @ApiProperty({
    description: 'Display name for the WhatsApp inbox',
    example: 'My WhatsApp Business',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'WhatsApp Business API access token',
  })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiProperty({
    description: 'WhatsApp phone number ID from Meta Business Suite',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @ApiProperty({
    description: 'WhatsApp Business Account ID',
  })
  @IsString()
  @IsNotEmpty()
  businessAccountId: string;

  @ApiProperty({
    description: 'Webhook verification token for incoming message validation',
  })
  @IsString()
  @IsNotEmpty()
  verifyToken: string;
}
