import { Injectable, Logger } from '@nestjs/common';
import { getConfig, getRefreshCookieOptions, UnauthorizedException } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { type Session, type SessionType, SessionTypeValues, sessions } from '@/db/schema';
import { SessionTokenResponseDto } from '../dto/session-token-response.dto';
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

  /** @deprecated Use createUnifiedSession instead */
  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    session: Session;
    accessToken: string;
    refreshToken: string;
  }> {
    // Generate refresh token FIRST (needed for token binding)
    const refreshToken = this.jwtService.generateRefreshToken(userId);
    // Generate access token with refresh token binding
    const accessToken = this.jwtService.generateAccessToken(userId, refreshToken);

    // Calculate expiry times
    const accessTokenExpiresAt = this.jwtService.getAccessTokenExpiryTime();
    const refreshTokenExpiresAt = this.jwtService.getRefreshTokenExpiryTime();

    // Create session
    const session = await this.sessionRepository.create({
      userId,
      type: SessionTypeValues.CLOUD,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      ipAddress,
      userAgent,
    });

    this.logger.log(`Created cloud session for user: ${userId}`);

    return {
      session,
      accessToken,
      refreshToken,
    };
  }

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

  // Finds an active session by refresh token, returning null if expired or inactive
  async getSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    const session = await this.sessionRepository.findOne({
      refreshToken,
    });

    if (!session || !session.isActive) {
      return null;
    }

    // Check if refresh token is expired
    if (session.refreshTokenExpiresAt && new Date() > session.refreshTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      return null;
    }

    return session;
  }

  // Finds an active session by refresh token or throws UnauthorizedException
  async getSessionByRefreshTokenOrThrow(refreshToken: string): Promise<Session> {
    const session = await this.getSessionByRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException({
        label: 'Invalid Session',
        detail: 'Your session has expired or is invalid. Please log in again.',
      });
    }

    return session;
  }

  // Rotates both access and refresh tokens for a session
  async refreshSession(refreshToken: string | undefined): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // Handle missing refresh token (no cookie present)
    if (!refreshToken) {
      throw new UnauthorizedException({
        label: 'No Session Found',
        detail: 'No active session found. Please sign up or log in again.',
      });
    }

    const session = await this.getSessionByRefreshTokenOrThrow(refreshToken);

    // Always rotate refresh token for security (generate FIRST for token binding)
    const newRefreshToken = this.jwtService.generateRefreshToken(session.userId);

    // Generate new access token with refresh token binding
    const newAccessToken =
      session.type === SessionTypeValues.ONBOARDING
        ? this.jwtService.generateOnboardingToken(session.userId, newRefreshToken)
        : this.jwtService.generateAccessToken(session.userId, newRefreshToken);

    // Calculate new expiry times
    const newAccessTokenExpiresAt =
      session.type === SessionTypeValues.ONBOARDING
        ? this.jwtService.getOnboardingTokenExpiryTime()
        : this.jwtService.getAccessTokenExpiryTime();
    const newRefreshTokenExpiresAt = this.jwtService.getRefreshTokenExpiryTime();

    // Update session with new tokens
    await this.sessionRepository.update(session.id, {
      accessToken: newAccessToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    });

    const expiresIn = Math.floor((newAccessTokenExpiresAt.getTime() - Date.now()) / 1000);

    this.logger.log(`Refreshed session for user: ${session.userId}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    };
  }

  // Generates new accessToken without rotating the refreshToken
  async recoverSession(refreshToken: string | undefined): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    // Handle missing refresh token (no cookie present)
    if (!refreshToken) {
      throw new UnauthorizedException({
        label: 'No Session Found',
        detail: 'No active session found. Please sign up or log in again.',
      });
    }

    const session = await this.getSessionByRefreshTokenOrThrow(refreshToken);

    // Generate new access token with existing refresh token binding
    const newAccessToken =
      session.type === SessionTypeValues.ONBOARDING
        ? this.jwtService.generateOnboardingToken(session.userId, refreshToken)
        : this.jwtService.generateAccessToken(session.userId, refreshToken);

    // Calculate new expiry time
    const newAccessTokenExpiresAt =
      session.type === SessionTypeValues.ONBOARDING
        ? this.jwtService.getOnboardingTokenExpiryTime()
        : this.jwtService.getAccessTokenExpiryTime();

    // Update session with new access token only (no refresh rotation)
    await this.sessionRepository.updateAccessToken(session.id, newAccessToken, newAccessTokenExpiresAt);

    const expiresIn = Math.floor((newAccessTokenExpiresAt.getTime() - Date.now()) / 1000);

    this.logger.log(`Recovered session for user: ${session.userId}`);

    return {
      accessToken: newAccessToken,
      expiresIn,
    };
  }

  /** @deprecated Use createUnifiedSession with SessionTypeValues.ONBOARDING instead */
  async createOnboardingSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    sessionId: string;
    onboardingToken: string;
  }> {
    // Generate refresh token FIRST (needed for token binding)
    const refreshToken = this.jwtService.generateRefreshToken(userId);

    // Generate onboarding token with refresh token binding
    const onboardingToken = this.jwtService.generateOnboardingToken(userId, refreshToken);

    // Calculate expiry times
    const accessTokenExpiresAt = this.jwtService.getOnboardingTokenExpiryTime();
    const refreshTokenExpiresAt = this.jwtService.getRefreshTokenExpiryTime();

    // Create session with both tokens
    const session = await this.sessionRepository.create({
      userId,
      type: SessionTypeValues.ONBOARDING,
      accessToken: onboardingToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      ipAddress,
      userAgent,
    });

    this.logger.log(`Created onboarding session for user: ${userId}`);

    return {
      sessionId: session.id,
      onboardingToken,
    };
  }

  // Retrieves an active onboarding session by ID and validates its state
  async getOnboardingSession(sessionId: string): Promise<{
    onboardingToken: string;
    userId: string;
  }> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException({
        label: 'Onboarding Session Not Found',
        detail: 'No active onboarding session found. Please sign up again.',
      });
    }

    if (session.type !== SessionTypeValues.ONBOARDING) {
      throw new UnauthorizedException({
        label: 'Invalid Session Type',
        detail: 'This is not an onboarding session.',
      });
    }

    if (!session.isActive) {
      throw new UnauthorizedException({
        label: 'Onboarding Session Invalidated',
        detail: 'Your onboarding session has been invalidated. Please sign up again.',
      });
    }

    // Check if token is expired
    if (new Date() > session.accessTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException({
        label: 'Onboarding Session Expired',
        detail: 'Your onboarding session has expired. Please sign up again.',
      });
    }

    return {
      onboardingToken: session.accessToken,
      userId: session.userId,
    };
  }

  // Retrieves the token for a session, returning appropriate type based on session kind
  async getSessionToken(sessionId: string): Promise<SessionTokenResponseDto> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException({
        label: 'Session Not Found',
        detail: 'No active session found. Please sign up or log in again.',
      });
    }

    if (!session.isActive) {
      throw new UnauthorizedException({
        label: 'Session Invalidated',
        detail: 'Your session has been invalidated. Please sign up or log in again.',
      });
    }

    if (new Date() > session.accessTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException({
        label: 'Session Expired',
        detail: 'Your session has expired. Please sign up or log in again.',
      });
    }

    if (session.type === SessionTypeValues.ONBOARDING) {
      return SessionTokenResponseDto.forOnboarding(session.accessToken);
    } else {
      if (!session.refreshToken) {
        throw new UnauthorizedException({
          label: 'Missing Refresh Token',
          detail: 'Cloud session is missing refresh token. Please log in again.',
        });
      }

      const expiresIn = Math.floor((session.accessTokenExpiresAt.getTime() - Date.now()) / 1000);

      return SessionTokenResponseDto.forCloud(session.accessToken, expiresIn > 0 ? expiresIn : 0);
    }
  }

  // Deletes all onboarding sessions for a user after onboarding completes
  async deleteOnboardingSessions(userId: string): Promise<void> {
    const sessionList = await this.sessionRepository.findMany({
      where: { userId, type: SessionTypeValues.ONBOARDING },
    });

    if (sessionList.length > 0) {
      const condition = and(eq(sessions.userId, userId), eq(sessions.type, SessionTypeValues.ONBOARDING));
      if (condition) {
        await this.sessionRepository.deleteMany(condition);
      }

      this.logger.log(`Deleted ${sessionList.length} onboarding sessions for user: ${userId}`);
    }
  }

  // Generates a new access token without rotating the refresh token
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    // Find session by refresh token (use object-based filter for Drizzle v2 relational API)
    const session = await this.sessionRepository.findOne({
      refreshToken,
    });

    if (!session || !session.isActive) {
      throw new UnauthorizedException({
        label: 'Session Expired',
        detail: 'Your session has expired. Please log in again.',
      });
    }

    // Check if refresh token is expired
    if (session.refreshTokenExpiresAt && new Date() > session.refreshTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException({
        label: 'Session Expired',
        detail: 'Your session has expired. Please log in again.',
      });
    }

    // Ensure refresh token exists (should always be present for cloud sessions)
    if (!session.refreshToken) {
      throw new UnauthorizedException({
        label: 'Token Refresh Not Supported',
        detail: 'This session does not support token refresh.',
      });
    }

    // Generate new access token with existing refresh token binding
    const newAccessToken = this.jwtService.generateAccessToken(payload.userId, refreshToken);
    const newAccessTokenExpiresAt = this.jwtService.getAccessTokenExpiryTime();

    // Update session
    await this.sessionRepository.updateAccessToken(session.id, newAccessToken, newAccessTokenExpiresAt);

    this.logger.log(`Refreshed access token for user: ${payload.userId}`);

    return {
      accessToken: newAccessToken,
      refreshToken: session.refreshToken, // Return same refresh token
    };
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
    const session = await this.sessionRepository.findOne({
      accessToken,
    });

    if (!session || !session.isActive) {
      throw new UnauthorizedException({
        label: 'Invalid Access Token',
        detail: 'Your session is invalid or has expired. Please log in again.',
      });
    }

    // Check if access token is expired
    if (new Date() > session.accessTokenExpiresAt) {
      throw new UnauthorizedException({
        label: 'Access Token Expired',
        detail: 'Your session has expired. Please refresh your access token.',
      });
    }

    return session;
  }
}
