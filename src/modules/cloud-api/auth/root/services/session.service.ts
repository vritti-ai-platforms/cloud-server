import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { getConfig, getRefreshCookieOptions, hashToken, UnauthorizedException } from '@vritti/api-sdk';
import { and, eq, ne } from '@vritti/api-sdk/drizzle-orm';
import { type Session, type SessionType, SessionTypeValues, sessions } from '@/db/schema';
import { JwtAuthService, TokenType } from '@vritti/api-sdk';
import { SessionRepository } from '../repositories/session.repository';

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
  async createSession(
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
    const expiresAt = this.jwtService.getExpiryTime(TokenType.REFRESH);

    const session = await this.sessionRepository.create({
      id: sessionId,
      userId,
      type: sessionType,
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      ipAddress,
      userAgent,
    });

    const expiresIn = this.jwtService.getExpiryInSeconds(TokenType.ACCESS);

    this.logger.log(`Created ${sessionType} session for user: ${userId}`);

    return { session, accessToken, refreshToken, expiresIn };
  }

  // Finds an active, non-expired session by refresh token or throws
  async getSessionByRefreshTokenOrThrow(refreshToken: string): Promise<Session> {
    const session = await this.sessionRepository.findByRefreshTokenHash(hashToken(refreshToken));
    return this.ensureSessionValid(session, session?.expiresAt ?? new Date(0));
  }

  // Rotates both access and refresh tokens for a session
  async refreshTokens(refreshToken: string | undefined): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const session = await this.validateRefreshToken(refreshToken);
    const newRefreshToken = this.jwtService.generateRefreshToken(session.userId, session.id, session.type);
    const { accessToken, expiresIn } = this.generateAccessTokenForSession(session, newRefreshToken);

    await this.sessionRepository.rotateTokens(
      session.id,
      hashToken(accessToken),
      hashToken(newRefreshToken),
      this.jwtService.getExpiryTime(TokenType.REFRESH),
    );

    this.logger.log(`Refreshed session for user: ${session.userId}`);

    return { accessToken, refreshToken: newRefreshToken, expiresIn };
  }

  // Generates new access token without rotating the refresh token
  async generateAccessToken(refreshToken: string | undefined): Promise<{
    accessToken: string;
    expiresIn: number;
    userId: string;
    sessionType: string;
  }> {
    const session = await this.validateRefreshToken(refreshToken);
    const { accessToken, expiresIn } = this.generateAccessTokenForSession(session, refreshToken as string);

    await this.sessionRepository.updateAccessTokenHash(session.id, hashToken(accessToken));

    this.logger.log(`Generated access token for user: ${session.userId}`);

    return { accessToken, expiresIn, userId: session.userId, sessionType: session.type };
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
  private generateAccessTokenForSession(session: Session, refreshToken: string): { accessToken: string; expiresIn: number } {
    const accessToken = this.jwtService.generateAccessToken(
      session.userId,
      session.id,
      session.type,
      refreshToken,
    );
    const expiresIn = this.jwtService.getExpiryInSeconds(TokenType.ACCESS);
    return { accessToken, expiresIn };
  }

  // Upgrades the current session type and deletes all other sessions of the old type
  async upgradeSession(
    sessionId: string,
    userId: string,
    fromType: SessionType,
    toType: SessionType,
  ): Promise<void> {
    await this.sessionRepository.update(sessionId, { type: toType });
    await this.deleteOtherSessionsByType(userId, fromType, sessionId);
    this.logger.log(`Upgraded session ${sessionId} from ${fromType} to ${toType} for user: ${userId}`);
  }

  // Deletes all sessions of a given type for a user, excluding one session
  private async deleteOtherSessionsByType(
    userId: string,
    type: SessionType,
    excludeSessionId: string,
  ): Promise<void> {
    const condition = and(
      eq(sessions.userId, userId),
      eq(sessions.type, type),
      ne(sessions.id, excludeSessionId),
    );
    if (condition) {
      const result = await this.sessionRepository.deleteMany(condition);
      if (result.count > 0) {
        this.logger.log(`Deleted ${result.count} other ${type} sessions for user: ${userId}`);
      }
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

  // Deletes a session directly by its ID (hard delete)
  async deleteSessionById(sessionId: string): Promise<void> {
    await this.sessionRepository.delete(sessionId);
    this.logger.log(`Deleted session: ${sessionId}`);
  }

  // Deletes the session matching the given access token (hard delete)
  async invalidateSession(accessToken: string): Promise<void> {
    const session = await this.sessionRepository.findByAccessTokenHash(hashToken(accessToken));
    if (session) {
      await this.sessionRepository.delete(session.id);
      this.logger.log(`Invalidated session: ${session.id}`);
    }
  }

  // Deletes all sessions for a user (hard delete)
  async invalidateAllUserSessions(userId: string): Promise<number> {
    const count = await this.sessionRepository.deleteAllByUserId(userId);
    this.logger.log(`Invalidated ${count} sessions for user: ${userId}`);
    return count;
  }

  // Returns all sessions for a user ordered by most recent
  async getUserActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.findAllByUserId(userId);
  }

  // Finds and validates a session by access token, throwing if expired
  async validateAccessToken(accessToken: string): Promise<Session> {
    const session = await this.sessionRepository.findByAccessTokenHash(hashToken(accessToken));
    return this.ensureSessionValid(session, session?.expiresAt ?? new Date(0));
  }

  // Checks session exists and is not expired; deletes and throws if invalid
  private async ensureSessionValid(session: Session | undefined, expiresAt: Date): Promise<Session> {
    if (!session) {
      throw new UnauthorizedException({
        label: 'Invalid Session',
        detail: 'Your session is invalid or has expired. Please log in again.',
      });
    }

    if (new Date() > expiresAt) {
      await this.sessionRepository.delete(session.id);
      throw new UnauthorizedException({
        label: 'Session Expired',
        detail: 'Your session has expired. Please log in again.',
      });
    }

    return session;
  }
}
