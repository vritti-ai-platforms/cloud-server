import { Injectable, Logger } from '@nestjs/common';
import { UnauthorizedException } from '@vritti/api-sdk';
import { eq, and } from '@vritti/api-sdk/drizzle-orm';
import { sessions, Session } from '@/db/schema';
import { SessionRepository } from '../repositories/session.repository';
import { JwtAuthService } from './jwt.service';
import { SessionTokenResponseDto } from '../dto/session-token-response.dto';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtAuthService,
  ) {}

  /**
   * Create a new cloud session with access and refresh tokens
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
    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken(userId);
    const refreshToken = this.jwtService.generateRefreshToken(userId);

    // Calculate expiry times
    const accessTokenExpiresAt = this.jwtService.getAccessTokenExpiryTime();
    const refreshTokenExpiresAt = this.jwtService.getRefreshTokenExpiryTime();

    // Create session
    const session = await this.sessionRepository.create({
      userId,
      type: 'CLOUD',
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
   * Create a new onboarding session
   * Returns session ID to be stored in cookie
   */
  async createOnboardingSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    sessionId: string;
    onboardingToken: string;
  }> {
    // Generate onboarding token
    const onboardingToken = this.jwtService.generateOnboardingToken(userId);

    // Calculate expiry time
    const accessTokenExpiresAt = this.jwtService.getOnboardingTokenExpiryTime();

    // Create session (store onboarding token in accessToken field)
    const session = await this.sessionRepository.create({
      userId,
      type: 'ONBOARDING',
      accessToken: onboardingToken,
      refreshToken: null,
      accessTokenExpiresAt,
      refreshTokenExpiresAt: null,
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
        'No active onboarding session found. Please sign up again.'
      );
    }

    if (session.type !== 'ONBOARDING') {
      throw new UnauthorizedException(
        'Invalid session type',
        'This is not an onboarding session.'
      );
    }

    if (!session.isActive) {
      throw new UnauthorizedException(
        'Onboarding session inactive',
        'Your onboarding session has been invalidated. Please sign up again.'
      );
    }

    // Check if token is expired
    if (new Date() > session.accessTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException(
        'Onboarding session expired',
        'Your onboarding session has expired. Please sign up again.'
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
      throw new UnauthorizedException(
        'Session not found',
        'No active session found. Please sign up or log in again.'
      );
    }

    if (!session.isActive) {
      throw new UnauthorizedException(
        'Session inactive',
        'Your session has been invalidated. Please sign up or log in again.'
      );
    }

    if (new Date() > session.accessTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException(
        'Session expired',
        'Your session has expired. Please sign up or log in again.'
      );
    }

    if (session.type === 'ONBOARDING') {
      return SessionTokenResponseDto.forOnboarding(session.accessToken);
    } else {
      if (!session.refreshToken) {
        throw new UnauthorizedException(
          'Invalid cloud session',
          'Cloud session is missing refresh token. Please log in again.'
        );
      }

      const expiresIn = Math.floor(
        (session.accessTokenExpiresAt.getTime() - Date.now()) / 1000
      );

      return SessionTokenResponseDto.forCloud(
        session.accessToken,
        session.refreshToken,
        expiresIn > 0 ? expiresIn : 0
      );
    }
  }

  /**
   * Delete all onboarding sessions for a user
   * Called when user completes onboarding and logs in
   */
  async deleteOnboardingSessions(userId: string): Promise<void> {
    const sessionList = await this.sessionRepository.findMany({
      where: and(
        eq(sessions.userId, userId),
        eq(sessions.type, 'ONBOARDING'),
      ),
    });

    if (sessionList.length > 0) {
      await this.sessionRepository.deleteMany(
        and(
          eq(sessions.userId, userId),
          eq(sessions.type, 'ONBOARDING'),
        )!,
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

    // Find session by refresh token
    const session = await this.sessionRepository.findOne(
      eq(sessions.refreshToken, refreshToken),
    );

    if (!session || !session.isActive) {
      throw new UnauthorizedException(
        'Invalid or expired refresh token',
        'Your session has expired. Please log in again.'
      );
    }

    // Check if refresh token is expired
    if (session.refreshTokenExpiresAt && new Date() > session.refreshTokenExpiresAt) {
      await this.sessionRepository.update(session.id, { isActive: false });
      throw new UnauthorizedException(
        'Refresh token expired. Please login again',
        'Your session has expired. Please log in again.'
      );
    }

    // Ensure refresh token exists (should always be present for cloud sessions)
    if (!session.refreshToken) {
      throw new UnauthorizedException(
        'Invalid session type',
        'This session does not support token refresh.'
      );
    }

    // Generate new access token
    const newAccessToken = this.jwtService.generateAccessToken(payload.userId);
    const newAccessTokenExpiresAt = this.jwtService.getAccessTokenExpiryTime();

    // Update session
    await this.sessionRepository.updateAccessToken(
      session.id,
      newAccessToken,
      newAccessTokenExpiresAt,
    );

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
    const session = await this.sessionRepository.findOne(
      eq(sessions.accessToken, accessToken),
    );

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
    const session = await this.sessionRepository.findOne(
      eq(sessions.accessToken, accessToken),
    );

    if (!session || !session.isActive) {
      throw new UnauthorizedException(
        'Invalid or expired access token',
        'Your session is invalid or has expired. Please log in again.'
      );
    }

    // Check if access token is expired
    if (new Date() > session.accessTokenExpiresAt) {
      throw new UnauthorizedException(
        'Access token expired. Please refresh',
        'Your session has expired. Please refresh your access token.'
      );
    }

    return session;
  }
}
