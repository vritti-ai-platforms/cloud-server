export class SessionTokenResponseDto {
  sessionType: 'onboarding' | 'cloud';

  onboardingToken?: string;

  accessToken?: string;
  refreshToken?: string;
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

  static forCloud(accessToken: string, refreshToken: string, expiresIn: number): SessionTokenResponseDto {
    return new SessionTokenResponseDto({
      sessionType: 'cloud',
      accessToken,
      refreshToken,
      expiresIn,
    });
  }
}
