import type { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';
import type { SessionType } from '@/db/schema';

export const jwtConfigFactory = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.getOrThrow<string>('JWT_SECRET'),
  signOptions: {
    issuer: 'vritti-api',
  },
});

type TokenExpiryString = `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

export interface TokenExpiry {
  access: TokenExpiryString;
  refresh: TokenExpiryString;
}

export const getTokenExpiry = (configService: ConfigService): TokenExpiry => ({
  access: configService.getOrThrow<string>('ACCESS_TOKEN_EXPIRY') as TokenExpiryString,
  refresh: configService.getOrThrow<string>('REFRESH_TOKEN_EXPIRY') as TokenExpiryString,
});

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface AccessTokenPayload {
  sessionType: SessionType;
  tokenType: TokenType.ACCESS;
  userId: string;
  sessionId: string;
  refreshTokenHash: string;
}

export interface RefreshTokenPayload {
  sessionType: SessionType;
  tokenType: TokenType.REFRESH;
  userId: string;
  sessionId: string;
}
