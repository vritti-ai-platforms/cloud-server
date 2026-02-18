import { ApiProperty } from '@nestjs/swagger';

export class OAuthUrlResponseDto {
  @ApiProperty({
    description: 'OAuth authorization URL to redirect the user to',
    example: 'https://api.instagram.com/oauth/authorize?client_id=...&state=...',
  })
  url: string;
}
