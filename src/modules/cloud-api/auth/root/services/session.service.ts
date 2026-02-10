import { Injectable, Logger } from '@nestjs/common';
import { getConfig, getRefreshCookieOptions, UnauthorizedException } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { type Session, type SessionType, SessionTypeValues, sessions } from '@/db/schema';
import { SessionRepository } from '../repositories/session.repository';
import { JwtAuthService } from './jwt.service';

// Note: findOne uses object-based filters (Drizzle v2 relational API)
// Use { fieldName: value } instead of eq(table.field, value)

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
    // Generate refresh token FIRST (needed for token binding)
    const refreshToken = this.jwtService.generateRefreshToken(userId);

    // Generate access token with refresh token binding
    const accessToken =
      sessionType === SessionTypeValues.ONBOARDING
        ? this.jwtService.generateOnboardingToken(userId, refreshToken)
        : this.jwtService.generateAccessToken(userId, refreshToken);

    // Calculate expiry times
    const accessTokenExpiresAt =
      sessionType === SessionTypeValues.ONBOARDING
        ? this.jwtService.getOnboardingTokenExpiryTime()
        : this.jwtService.getAccessTokenExpiryTime();
    const refreshTokenExpiresAt = this.jwtService.getRefreshTokenExpiryTime();

    // Create session with both tokens
    const session = await this.sessionRepository.create({
      userId,
      type: sessionType,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      ipAddress,
      userAgent,
    });

    // Calculate expiresIn in seconds
    const expiresIn = Math.floor((accessTokenExpiresAt.getTime() - Date.now()) / 1000);

    this.logger.log(`Created unified ${sessionType} session for user: ${userId}`);

    return {
      session,
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  // Finds an active, non-expired session by refresh token or throws
  async getSessionByRefreshTokenOrThrow(refreshToken: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({ refreshToken });
    return this.ensureSessionValid(session, session?.refreshTokenExpiresAt ?? new Date(0));
  }

  // Rotates both access and refresh tokens for a session
  async refreshSession(refreshToken: string | undefined): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const session = await this.validateRefreshToken(refreshToken);
    const newRefreshToken = this.jwtService.generateRefreshToken(session.userId);
    const { accessToken, expiresIn } = this.generateAccessTokenForSession(session, newRefreshToken);

    await this.sessionRepository.update(session.id, {
      accessToken,
      accessTokenExpiresAt: this.getAccessTokenExpiry(session.type),
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: this.jwtService.getRefreshTokenExpiryTime(),
    });

    this.logger.log(`Refreshed session for user: ${session.userId}`);

    return { accessToken, refreshToken: newRefreshToken, expiresIn };
  }

  // Generates new access token without rotating the refresh token
  async recoverSession(refreshToken: string | undefined): Promise<{
    accessToken: string;
    expiresIn: number;
    userId: string;
  }> {
    const session = await this.validateRefreshToken(refreshToken);
    const { accessToken, expiresIn } = this.generateAccessTokenForSession(session, session.refreshToken);

    await this.sessionRepository.updateAccessToken(session.id, accessToken, this.getAccessTokenExpiry(session.type));

    this.logger.log(`Recovered session for user: ${session.userId}`);

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

  // Generates an access token bound to the given refresh token based on session type
  private generateAccessTokenForSession(
    session: Session,
    refreshToken: string,
  ): { accessToken: string; expiresIn: number } {
    const accessToken =
      session.type === SessionTypeValues.ONBOARDING
        ? this.jwtService.generateOnboardingToken(session.userId, refreshToken)
        : this.jwtService.generateAccessToken(session.userId, refreshToken);

    const expiresIn = Math.floor((this.getAccessTokenExpiry(session.type).getTime() - Date.now()) / 1000);

    return { accessToken, expiresIn };
  }

  // Returns the access token expiry time based on session type
  private getAccessTokenExpiry(sessionType: SessionType): Date {
    return sessionType === SessionTypeValues.ONBOARDING
      ? this.jwtService.getOnboardingTokenExpiryTime()
      : this.jwtService.getAccessTokenExpiryTime();
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
    const session = await this.sessionRepository.findOne({
      accessToken,
    });

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
    return await this.sessionRepository.findActiveByUserId(userId);
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
