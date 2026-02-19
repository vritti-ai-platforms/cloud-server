import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PasskeyAuthUserDto {
  @ApiProperty({ example: 'usr_abc123' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  fullName: string | null;

  @ApiPropertyOptional({ example: 'johndoe' })
  displayName: string | null;
}

export class PasskeyAuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ example: 900 })
  expiresIn: number;

  @ApiProperty({ type: PasskeyAuthUserDto })
  user: PasskeyAuthUserDto;

  // Refresh token is not serialized — used by the controller for cookie setting only
  refreshToken: string;

  constructor(data: {
    accessToken: string;
    expiresIn: number;
    refreshToken: string;
    user: { id: string; email: string; fullName: string | null; displayName: string | null };
  }) {
    this.accessToken = data.accessToken;
    this.expiresIn = data.expiresIn;
    this.refreshToken = data.refreshToken;
    this.user = {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.fullName,
      displayName: data.user.displayName,
    };
  }
}
