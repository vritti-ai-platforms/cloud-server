import { Injectable, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getTokenExpiry, TokenType } from '../../../../config/jwt.config';

/**
 * JWT Service for Auth module
 * Handles generation and verification of access and refresh tokens
 */
@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private readonly tokenExpiry: ReturnType<typeof getTokenExpiry>;

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {
    this.tokenExpiry = getTokenExpiry(configService);
  }

  /**
   * Generate access token (15 minutes)
   */
  generateAccessToken(userId: string): string {
    return this.jwtService.sign(
      {
        userId,
        type: TokenType.ACCESS,
      },
      {
        expiresIn: this.tokenExpiry.ACCESS as any,
      },
    );
  }

  /**
   * Generate refresh token (7 days)
   */
  generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      {
        userId,
        type: TokenType.REFRESH,
      },
      {
        expiresIn: this.tokenExpiry.REFRESH as any,
      },
    );
  }

  /**
   * Verify access token
   */
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

  /**
   * Verify refresh token
   */
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

  /**
   * Calculate expiry time for access token
   */
  getAccessTokenExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 15); // 15 minutes
    return expiryTime;
  }

  /**
   * Calculate expiry time for refresh token
   */
  getRefreshTokenExpiryTime(): Date {
    const expiryTime = new Date();
    expiryTime.setDate(expiryTime.getDate() + 7); // 7 days
    return expiryTime;
  }

  /**
   * Get access token expiry in seconds (for response)
   */
  getAccessTokenExpiryInSeconds(): number {
    return 15 * 60; // 15 minutes in seconds
  }
}
