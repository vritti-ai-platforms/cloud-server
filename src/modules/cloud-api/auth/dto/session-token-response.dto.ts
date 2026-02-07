import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionTokenResponseDto {
  @ApiProperty({
    description: 'The type of session returned based on user authentication state',
    enum: ['onboarding', 'cloud'],
    example: 'cloud',
  })
  sessionType: 'onboarding' | 'cloud';

  @ApiPropertyOptional({
    description: 'JWT token for continuing the onboarding flow. Only present when sessionType is "onboarding"',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  })
  onboardingToken?: string;

  @ApiPropertyOptional({
    description: 'JWT access token for authenticated API requests. Only present when sessionType is "cloud"',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImlhdCI6MTUxNjIzOTAyMn0.4S5k1aGHGiEYz0rT8vXpKmKrLgPJ8Ww1qZ2xY3nN4oM',
  })
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Access token expiration time in seconds',
    example: 3600,
  })
  expiresIn?: number;

  constructor(partial: Partial<SessionTokenResponseDto>) {
    Object.assign(this, partial);
  }

  static forOnboarding(onboardingToken: string): SessionTokenResponseDto {
    return new SessionTokenResponseDto({
      sessionType: 'onboarding',
      onboardingToken,
    });
  }

  static forCloud(accessToken: string, expiresIn: number): SessionTokenResponseDto {
    return new SessionTokenResponseDto({
      sessionType: 'cloud',
      accessToken,
      expiresIn,
    });
  }
}
