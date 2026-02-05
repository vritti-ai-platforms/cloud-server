import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../user/dto/user-response.dto';

/**
 * Response DTO for authentication status check
 * Used by GET /auth/me endpoint to return auth status without errors
 */
export class AuthStatusResponseDto {
  @ApiProperty({
    description: 'Whether the user is authenticated',
    example: true,
  })
  isAuthenticated: boolean;

  @ApiPropertyOptional({
    description: 'User information (only present when authenticated)',
    type: () => UserResponseDto,
  })
  user?: UserResponseDto;

  @ApiPropertyOptional({
    description: 'JWT access token (only present when authenticated)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Token expiry in seconds (only present when authenticated)',
    example: 3600,
  })
  expiresIn?: number;

  constructor(partial: Partial<AuthStatusResponseDto>) {
    Object.assign(this, partial);
  }
}
