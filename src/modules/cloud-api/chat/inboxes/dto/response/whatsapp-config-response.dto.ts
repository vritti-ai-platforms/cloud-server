import { ApiProperty } from '@nestjs/swagger';

export class WhatsAppConfigResponseDto {
  @ApiProperty({
    description: 'Facebook App ID for initializing the JS SDK',
    example: '25787113254284000',
  })
  appId: string;

  @ApiProperty({
    description: 'WhatsApp Embedded Signup configuration ID from Meta Business Settings',
    example: '1463637715370795',
  })
  configId: string;
}
