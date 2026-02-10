import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { getConfig, getRefreshCookieOptions, UnauthorizedException } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { type Session, type SessionType, SessionTypeValues, sessions } from '@/db/schema';
import { TokenType } from '../../../../../config/jwt.config';
import { SessionRepository } from '../repositories/session.repository';
import { JwtAuthService } from './jwt.service';

export function getRefreshCookieName(): string {
  return getConfig().cookie.refreshCookieName;
}

export function getRefreshCookieOptionsFromConfig() {
  return getRefreshCookieOptions();
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtAuthService,
  ) {}

  // Creates a session with both access and refresh tokens for any session type
  async createUnifiedSession(
    userId: string,
    sessionType: SessionType,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    session: Session;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const sessionId = randomUUID();
    const refreshToken = this.jwtService.generateRefreshToken(userId, sessionId, sessionType);
    const accessToken = this.jwtService.generateAccessToken(userId, sessionId, sessionType, refreshToken);
    const accessTokenExpiresAt = this.jwtService.getExpiryTime(TokenType.ACCESS);
    const refreshTokenExpiresAt = this.jwtService.getExpiryTime(TokenType.REFRESH);

    const session = await this.sessionRepository.create({
      id: sessionId,
      userId,
      type: sessionType,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      ipAddress,
      userAgent,
    });

    const expiresIn = this.jwtService.getExpiryInSeconds(TokenType.ACCESS);

    this.logger.log(`Created ${sessionType} session for user: ${userId}`);

    return { session, accessToken, refreshToken, expiresIn };
  }

  // Finds an active, non-expired session by refresh token or throws
  async getSessionByRefreshTokenOrThrow(refreshToken: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({ refreshToken });
    return this.ensureSessionValid(session, session?.refreshTokenExpiresAt ?? new Date(0));
  }

  // Rotates both access and refresh tokens for a session
  async refreshTokens(refreshToken: string | undefined): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const session = await this.validateRefreshToken(refreshToken);
    const newRefreshToken = this.jwtService.generateRefreshToken(session.userId, session.id, session.type);
    session.refreshToken = newRefreshToken;
    const { accessToken, expiresIn } = this.generateAccessTokenForSession(session);

    await this.sessionRepository.update(session.id, {
      accessToken,
      accessTokenExpiresAt: this.jwtService.getExpiryTime(TokenType.ACCESS),
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: this.jwtService.getExpiryTime(TokenType.REFRESH),
    });

    this.logger.log(`Refreshed session for user: ${session.userId}`);

    return { accessToken, refreshToken: newRefreshToken, expiresIn };
  }

  // Generates new access token without rotating the refresh token
  async generateAccessToken(refreshToken: string | undefined): Promise<{
    accessToken: string;
    expiresIn: number;
    userId: string;
  }> {
    const session = await this.validateRefreshToken(refreshToken);
    const { accessToken, expiresIn } = this.generateAccessTokenForSession(session);

    await this.sessionRepository.updateAccessToken(session.id, accessToken, this.jwtService.getExpiryTime(TokenType.ACCESS));

    this.logger.log(`Generated access token for user: ${session.userId}`);

    return { accessToken, expiresIn, userId: session.userId };
  }

  // Validates refresh token presence and returns the active session
  private async validateRefreshToken(refreshToken: string | undefined): Promise<Session> {
    if (!refreshToken) {
      throw new UnauthorizedException({
        label: 'No Session Found',
        detail: 'No active session found. Please sign up or log in again.',
      });
    }
    return this.getSessionByRefreshTokenOrThrow(refreshToken);
  }

  // Generates an access token bound to the session's refresh token
  private generateAccessTokenForSession(session: Session): { accessToken: string; expiresIn: number } {
    const accessToken = this.jwtService.generateAccessToken(session.userId, session.id, session.type, session.refreshToken);
    const expiresIn = this.jwtService.getExpiryInSeconds(TokenType.ACCESS);
    return { accessToken, expiresIn };
  }

  // Upgrades all ONBOARDING sessions to CLOUD and regenerates tokens
  async upgradeToCloudSession(userId: string): Promise<void> {
    const onboardingSessions = await this.sessionRepository.findMany({
      where: { userId, type: SessionTypeValues.ONBOARDING, isActive: true },
    });

    for (const session of onboardingSessions) {
      const refreshToken = this.jwtService.generateRefreshToken(userId, session.id, SessionTypeValues.CLOUD);
      const accessToken = this.jwtService.generateAccessToken(userId, session.id, SessionTypeValues.CLOUD, refreshToken);

      await this.sessionRepository.update(session.id, {
        type: SessionTypeValues.CLOUD,
        accessToken,
        refreshToken,
        accessTokenExpiresAt: this.jwtService.getExpiryTime(TokenType.ACCESS),
        refreshTokenExpiresAt: this.jwtService.getExpiryTime(TokenType.REFRESH),
      });
    }

    if (onboardingSessions.length > 0) {
      this.logger.log(`Upgraded ${onboardingSessions.length} onboarding sessions to CLOUD for user: ${userId}`);
    }
  }

  // Deletes all onboarding sessions for a user after onboarding completes
  async deleteOnboardingSessions(userId: string): Promise<void> {
    const condition = and(eq(sessions.userId, userId), eq(sessions.type, SessionTypeValues.ONBOARDING));
    if (condition) {
      const result = await this.sessionRepository.deleteMany(condition);
      if (result.count > 0) {
        this.logger.log(`Deleted ${result.count} onboarding sessions for user: ${userId}`);
      }
    }
  }

  // Guard validates JWT cryptographically; service manages session state in DB
  async invalidateSession(accessToken: string): Promise<void> {
    const session = await this.sessionRepository.findOne({ accessToken });
    if (session) {
      await this.sessionRepository.update(session.id, { isActive: false });
      this.logger.log(`Invalidated session: ${session.id}`);
    }
  }

  // Marks all active sessions for a user as inactive
  async invalidateAllUserSessions(userId: string): Promise<number> {
    const count = await this.sessionRepository.invalidateAllByUserId(userId);
    this.logger.log(`Invalidated ${count} sessions for user: ${userId}`);
    return count;
  }

  // Returns all active sessions for a user ordered by most recent
  async getUserActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.findActiveByUserId(userId);
  }

  // Finds and validates a session by access token, throwing if expired or inactive
  async validateAccessToken(accessToken: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({ accessToken });
    return this.ensureSessionValid(session, session?.accessTokenExpiresAt ?? new Date(0));
  }

  // Checks session is active and not expired; deactivates and throws if invalid
  private async ensureSessionValid(session: Session | undefined, expiresAt: Date): Promise<Session> {
    if (!session || !session.isActive) {
      throw new UnauthorizedException({
        label: 'Invalid Session',
        detail: 'Your session is invalid or has expired. Please log in again.',
      });
    }

    if (new Date() > expiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException({
        label: 'Session Expired',
        detail: 'Your session has expired. Please log in again.',
      });
    }

    return session;
  }
}
