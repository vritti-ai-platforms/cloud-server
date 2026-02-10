import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserDto } from '../../../../user/dto/entity/user.dto';

export class AuthStatusResponse {
  @ApiProperty({
    description: 'Whether the user is authenticated',
    example: true,
  })
  isAuthenticated: boolean;

  @ApiPropertyOptional({
    description: 'User information (only present when authenticated)',
    type: () => UserDto,
  })
  user?: UserDto;

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

  @ApiPropertyOptional({
    description: 'Whether the user needs to complete onboarding',
    example: false,
  })
  requiresOnboarding?: boolean;

  constructor(partial: Partial<AuthStatusResponse>) {
    Object.assign(this, partial);
  }
}
