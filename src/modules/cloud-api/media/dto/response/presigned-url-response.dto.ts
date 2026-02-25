import { ApiProperty } from '@nestjs/swagger';

export class PresignedUrlResponseDto {
  @ApiProperty({ example: 'https://account.r2.cloudflarestorage.com/bucket/key?signature=...' })
  url: string;

  @ApiProperty({ example: 3600, description: 'URL expiry in seconds' })
  expiresIn: number;
}
