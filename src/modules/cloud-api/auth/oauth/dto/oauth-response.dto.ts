import { ApiProperty } from '@nestjs/swagger';

/**
 * User information returned in OAuth response
 */
class OAuthUserDto {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: 'usr_abc123def456',
  })
  id: string;

  @ApiProperty({
    description: 'User email address from OAuth provider',
    example: 'john.doe@example.com',
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'User first name from OAuth provider profile',
    example: 'John',
    nullable: true,
  })
  firstName: string | null;

  @ApiProperty({
    description: 'User last name from OAuth provider profile',
    example: 'Doe',
    nullable: true,
  })
  lastName: string | null;

  @ApiProperty({
    description: 'Current step in the onboarding flow',
    example: 'PROFILE_SETUP',
  })
  onboardingStep: string;

  @ApiProperty({
    description: 'Whether the user email has been verified',
    example: true,
  })
  emailVerified: boolean;
}

/**
 * Response DTO for OAuth authentication
 */
export class OAuthResponseDto {
  @ApiProperty({
    description: 'JWT token for continuing the onboarding flow after OAuth authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfYWJjMTIzIiwib25ib2FyZGluZyI6dHJ1ZSwiaWF0IjoxNTE2MjM5MDIyfQ.7K8mN3pLqR5vX9wYz1tU2sK4jF6hN5cD3eB0aQ9mW7I',
  })
  onboardingToken: string;

  @ApiProperty({
    description: 'User information retrieved from OAuth provider and stored in database',
    type: OAuthUserDto,
  })
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    onboardingStep: string;
    emailVerified: boolean;
  };

  @ApiProperty({
    description: 'Indicates whether this is a newly created user account or a returning user',
    example: false,
  })
  isNewUser: boolean;

  @ApiProperty({
    description: 'Indicates whether the user needs to set up a password. True for OAuth-only users who have not set a password',
    example: true,
  })
  requiresPasswordSetup: boolean;

  /**
   * Factory method to create OAuthResponseDto
   */
  static create(
    onboardingToken: string,
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      onboardingStep: string;
      emailVerified: boolean;
      passwordHash: string | null;
    },
    isNewUser: boolean,
  ): OAuthResponseDto {
    return {
      onboardingToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingStep: user.onboardingStep,
        emailVerified: user.emailVerified,
      },
      isNewUser,
      requiresPasswordSetup: !user.passwordHash,
    };
  }
}
