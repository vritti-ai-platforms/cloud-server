import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type JwtSignOptions, JwtService as NestJwtService } from '@nestjs/jwt';
import { hashToken } from '@vritti/api-sdk';
import type { SessionType } from '@/db/schema';
import { getTokenExpiry, type TokenExpiry, TokenType } from '../../../../../config/jwt.config';

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private readonly tokenExpiry: TokenExpiry;

  constructor(
    private readonly jwtService: NestJwtService,
    readonly configService: ConfigService,
  ) {
    this.tokenExpiry = getTokenExpiry(configService);
  }

  // Generates an access token bound to the given refresh token
  generateAccessToken(userId: string, sessionId: string, sessionType: SessionType, refreshToken: string): string {
    return this.jwtService.sign(
      { sessionType, tokenType: TokenType.ACCESS, userId, sessionId, refreshTokenHash: hashToken(refreshToken) },
      { expiresIn: this.tokenExpiry.ACCESS },
    );
  }

  // Generates a refresh token for session persistence
  generateRefreshToken(userId: string, sessionId: string, sessionType: SessionType): string {
    return this.jwtService.sign(
      { sessionType, tokenType: TokenType.REFRESH, userId, sessionId },
      { expiresIn: this.tokenExpiry.REFRESH },
    );
  }

  // Signs an arbitrary payload with optional JWT options
  sign(payload: object, options?: JwtSignOptions): string {
    return this.jwtService.sign(payload, options);
  }

  // Verifies a token and ensures it matches the expected token type
  verify(
    token: string,
    expectedType: TokenType,
  ): { userId: string; sessionId: string; sessionType: SessionType; tokenType: TokenType } {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.tokenType !== expectedType) {
        throw new Error(`Expected ${expectedType} token, got ${payload.tokenType}`);
      }

      return payload;
    } catch (error) {
      this.logger.error(`Failed to verify ${expectedType} token`, error);
      throw error;
    }
  }

  // Returns the expiry as a Date for the given token type
  getExpiryTime(type: TokenType): Date {
    return new Date(Date.now() + this.parseExpiryToMs(this.tokenExpiry[type]));
  }

  // Returns the token lifetime in seconds for the given type
  getExpiryInSeconds(type: TokenType): number {
    return Math.floor(this.parseExpiryToMs(this.tokenExpiry[type]) / 1000);
  }

  // Parses expiry strings like '15m', '24h', '30d' to milliseconds
  private parseExpiryToMs(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhdwy])$/);
    if (!match) throw new Error(`Invalid expiry format: ${expiry}`);

    const value = Number.parseInt(match[1], 10);
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
      w: 604_800_000,
      y: 31_536_000_000,
    };

    return value * multipliers[match[2]];
  }
}
