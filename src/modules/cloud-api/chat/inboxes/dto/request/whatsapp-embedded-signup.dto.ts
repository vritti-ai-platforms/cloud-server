import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class WhatsAppEmbeddedSignupDto {
  @ApiProperty({
    description: 'Authorization code from Facebook JS SDK FB.login() callback',
    example: 'AQB3z...',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'WhatsApp Business Account ID from the WA_EMBEDDED_SIGNUP postMessage event',
    example: '100000000000001',
  })
  @IsString()
  @IsNotEmpty()
  wabaId: string;

  @ApiProperty({
    description: 'Phone Number ID from the WA_EMBEDDED_SIGNUP postMessage event',
    example: '100000000000000',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;
}
