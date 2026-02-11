import { ApiProperty } from '@nestjs/swagger';

export class TokenResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 3600 })
  expiresIn: number;
}
