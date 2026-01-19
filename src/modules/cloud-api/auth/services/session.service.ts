import { Injectable, Logger } from '@nestjs/common';
import { getConfig, getRefreshCookieOptions, UnauthorizedException } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { type Session, type SessionType, SessionTypeValues, sessions } from '@/db/schema';
import { SessionTokenResponseDto } from '../dto/session-token-response.dto';
import { SessionRepository } from '../repositories/session.repository';
import { JwtAuthService } from './jwt.service';

// Note: findOne uses object-based filters (Drizzle v2 relational API)
// Use { fieldName: value } instead of eq(table.field, value)

/**
 * Refresh cookie name - derived from api-sdk config
 * Uses config defaults if configureApiSdk() hasn't been called yet
 */
export const REFRESH_COOKIE_NAME = getConfig().cookie.refreshCookieName;

/**
 * Refresh cookie options - derived from api-sdk config
 * Uses config defaults if configureApiSdk() hasn't been called yet
 */
export const REFRESH_COOKIE_OPTIONS = getRefreshCookieOptions();

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtAuthService,
  ) {}

  /**
   * Create a new cloud session with access and refresh tokens
   * @deprecated Use createUnifiedSession instead
   */
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

  /**
   * Create a unified session - ALL session types get accessToken + refreshToken
   * This is the preferred method for creating new sessions.
   *
   * The refresh token is generated FIRST, then the access token is generated
   * with the refresh token hash embedded for token binding security.
   *
   * @param userId - The user's ID
   * @param sessionType - Type of session (ONBOARDING, CLOUD, etc.)
   * @param ipAddress - Client IP address (optional)
   * @param userAgent - Client user agent (optional)
   * @returns Session object with tokens and expiry info
   */
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

  /**
   * Get session by refresh token (from httpOnly cookie)
   * Validates that session is active and refresh token is not expired
   *
   * @param refreshToken - The refresh token from cookie
   * @returns Session if valid, null if not found or invalid
   */
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

  /**
   * Refresh session - generates new accessToken and rotates refreshToken
   * Called by POST /auth/refresh endpoint
   *
   * @param refreshToken - The current refresh token from cookie
   * @returns New accessToken, new refreshToken, and expiresIn
   * @throws UnauthorizedException if session is invalid
   */
  async refreshSession(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const session = await this.getSessionByRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException(
        'Invalid session',
        'Your session has expired or is invalid. Please log in again.',
      );
    }

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

  /**
   * Recover session - generates new accessToken WITHOUT rotating refreshToken
   * Called by GET /auth/token endpoint for page reload recovery
   *
   * The new access token is bound to the existing refresh token.
   *
   * @param refreshToken - The current refresh token from cookie
   * @returns New accessToken and expiresIn (same refresh token)
   * @throws UnauthorizedException if session is invalid
   */
  async recoverSession(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const session = await this.getSessionByRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException(
        'Invalid session',
        'Your session has expired or is invalid. Please log in again.',
      );
    }

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

  /**
   * Create a new onboarding session
   * Returns session ID to be stored in cookie
   * @deprecated Use createUnifiedSession with SessionTypeValues.ONBOARDING instead
   */
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

  /**
   * Get onboarding session by session ID
   * Validates session is active and not expired
   */
  async getOnboardingSession(sessionId: string): Promise<{
    onboardingToken: string;
    userId: string;
  }> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException(
        'Onboarding session not found',
        'No active onboarding session found. Please sign up again.',
      );
    }

    if (session.type !== SessionTypeValues.ONBOARDING) {
      throw new UnauthorizedException('Invalid session type', 'This is not an onboarding session.');
    }

    if (!session.isActive) {
      throw new UnauthorizedException(
        'Onboarding session inactive',
        'Your onboarding session has been invalidated. Please sign up again.',
      );
    }

    // Check if token is expired
    if (new Date() > session.accessTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException(
        'Onboarding session expired',
        'Your onboarding session has expired. Please sign up again.',
      );
    }

    return {
      onboardingToken: session.accessToken,
      userId: session.userId,
    };
  }

  /**
   * Get session token(s) by session ID (unified endpoint for both onboarding and cloud)
   */
  async getSessionToken(sessionId: string): Promise<SessionTokenResponseDto> {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException('Session not found', 'No active session found. Please sign up or log in again.');
    }

    if (!session.isActive) {
      throw new UnauthorizedException(
        'Session inactive',
        'Your session has been invalidated. Please sign up or log in again.',
      );
    }

    if (new Date() > session.accessTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException('Session expired', 'Your session has expired. Please sign up or log in again.');
    }

    if (session.type === SessionTypeValues.ONBOARDING) {
      return SessionTokenResponseDto.forOnboarding(session.accessToken);
    } else {
      if (!session.refreshToken) {
        throw new UnauthorizedException(
          'Invalid cloud session',
          'Cloud session is missing refresh token. Please log in again.',
        );
      }

      const expiresIn = Math.floor((session.accessTokenExpiresAt.getTime() - Date.now()) / 1000);

      return SessionTokenResponseDto.forCloud(session.accessToken, session.refreshToken, expiresIn > 0 ? expiresIn : 0);
    }
  }

  /**
   * Delete all onboarding sessions for a user
   * Called when user completes onboarding and logs in
   */
  async deleteOnboardingSessions(userId: string): Promise<void> {
    const sessionList = await this.sessionRepository.findMany({
      where: { userId, type: SessionTypeValues.ONBOARDING },
    });

    if (sessionList.length > 0) {
      await this.sessionRepository.deleteMany(
        and(eq(sessions.userId, userId), eq(sessions.type, SessionTypeValues.ONBOARDING))!,
      );

      this.logger.log(`Deleted ${sessionList.length} onboarding sessions for user: ${userId}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
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
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
        'Your session has expired. Please log in again.',
      );
    }

    // Check if refresh token is expired
    if (session.refreshTokenExpiresAt && new Date() > session.refreshTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException(
        'Refresh token expired. Please login again',
        'Your session has expired. Please log in again.',
      );
    }

    // Ensure refresh token exists (should always be present for cloud sessions)
    if (!session.refreshToken) {
      throw new UnauthorizedException('Invalid session type', 'This session does not support token refresh.');
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

  /**
   * Invalidate a session (logout)
   */
  async invalidateSession(accessToken: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      accessToken,
    });

    if (session) {
      await this.sessionRepository.update(session.id, { isActive: false });
      this.logger.log(`Invalidated session: ${session.id}`);
    }
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<number> {
    const count = await this.sessionRepository.invalidateAllByUserId(userId);
    this.logger.log(`Invalidated ${count} sessions for user: ${userId}`);
    return count;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<Session[]> {
    return await this.sessionRepository.findActiveByUserId(userId);
  }

  /**
   * Validate access token
   */
  async validateAccessToken(accessToken: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      accessToken,
    });

    if (!session || !session.isActive) {
      throw new UnauthorizedException(
        'Invalid or expired access token',
        'Your session is invalid or has expired. Please log in again.',
      );
    }

    // Check if access token is expired
    if (new Date() > session.accessTokenExpiresAt) {
      throw new UnauthorizedException(
        'Access token expired. Please refresh',
        'Your session has expired. Please refresh your access token.',
      );
    }

    return session;
  }
}
