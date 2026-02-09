import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type JwtSignOptions, JwtService as NestJwtService } from '@nestjs/jwt';
import { hashToken } from '@vritti/api-sdk';
import { getTokenExpiry, TokenType } from '../../../../../config/jwt.config';

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private readonly tokenExpiry: ReturnType<typeof getTokenExpiry>;

  constructor(
    private readonly jwtService: NestJwtService,
    readonly configService: ConfigService,
  ) {
    this.tokenExpiry = getTokenExpiry(configService);
  }

  // Generates a short-lived access token bound to the given refresh token
  generateAccessToken(userId: string, refreshToken: string): string {
    return this.jwtService.sign(
      {
        userId,
        type: TokenType.ACCESS,
        refreshTokenHash: hashToken(refreshToken),
      },
      {
        expiresIn: this.tokenExpiry.ACCESS,
      },
    );
  }

  // Generates a long-lived refresh token for session persistence
  generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      {
        userId,
        type: TokenType.REFRESH,
      },
      {
        expiresIn: this.tokenExpiry.REFRESH,
      },
    );
  }

  // Generates an onboarding token bound to the given refresh token
  generateOnboardingToken(userId: string, refreshToken: string): string {
    return this.jwtService.sign(
      {
        userId,
        type: TokenType.ONBOARDING,
        refreshTokenHash: hashToken(refreshToken),
      },
      {
        expiresIn: this.tokenExpiry.ONBOARDING,
      },
    );
  }

  // Signs an arbitrary payload with optional JWT options
  sign(payload: object, options?: JwtSignOptions): string {
    return this.jwtService.sign(payload, options);
  }

  // Verifies and decodes an access token, ensuring correct token type
  verifyAccessToken(token: string): { userId: string; type: TokenType } {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== TokenType.ACCESS) {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      this.logger.error('Failed to verify access token', error);
      throw error;
    }
  }

  // Verifies and decodes a refresh token, ensuring correct token type
  verifyRefreshToken(token: string): { userId: string; type: TokenType } {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.type !== TokenType.REFRESH) {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      this.logger.error('Failed to verify refresh token', error);
      throw error;
    }
  }

  // Returns the access token expiry as a Date (15 minutes from now)
  getAccessTokenExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 15); // 15 minutes
    return expiryTime;
  }

  // Returns the refresh token expiry as a Date (7 days from now)
  getRefreshTokenExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setDate(expiryTime.getDate() + 7); // 7 days
    return expiryTime;
  }

  // Returns the onboarding token expiry as a Date (7 days from now)
  getOnboardingTokenExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setDate(expiryTime.getDate() + 7); // 7 days
    return expiryTime;
  }

  // Returns the access token lifetime in seconds
  getAccessTokenExpiryInSeconds(): number {
    return 15 * 60; // 15 minutes in seconds
  }
}
