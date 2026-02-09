import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Logger,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ApiSignup,
  ApiGetToken,
  ApiLogin,
  ApiRefreshToken,
  ApiLogout,
  ApiLogoutAll,
  ApiGetCurrentUser,
  ApiForgotPassword,
  ApiVerifyResetOtp,
  ApiResetPassword,
  ApiChangePassword,
  ApiGetSessions,
  ApiRevokeSession,
} from '../docs/auth.docs';
import { NotFoundException, Public, UnauthorizedException, UserId } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionTypeValues } from '@/db/schema';
import type { OnboardingStatusResponseDto } from '../../onboarding/dto/onboarding-status-response.dto';
import { UserService } from '../../user/user.service';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import { AuthStatusResponseDto } from '../dto/auth-status-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetOtpDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { SessionResponseDto } from '../dto/session-response.dto';
import { SignupDto } from '../dto/signup.dto';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig, SessionService } from '../services/session.service';

/**
 * Auth Controller
 * Handles user authentication, token refresh, and logout
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /**
   * User signup
   * POST /auth/signup
   * Creates unified onboarding session with accessToken + refreshToken
   * Sets refreshToken in httpOnly cookie, returns accessToken to frontend
   */
  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiSignup()
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<OnboardingStatusResponseDto & { accessToken: string; expiresIn: number }> {
    this.logger.log(`POST /auth/signup - Email: ${signupDto.email}`);

    // Create user and get onboarding status
    const response = await this.authService.signup(signupDto);

    // Create unified onboarding session with both tokens
    const { accessToken, refreshToken, expiresIn } = await this.sessionService.createUnifiedSession(
      response.userId,
      SessionTypeValues.ONBOARDING,
      ipAddress,
      userAgent,
    );

    // Set refresh token in httpOnly cookie (domain from REFRESH_COOKIE_DOMAIN env var)
    reply.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());

    this.logger.log(`Created unified onboarding session for user: ${response.userId}`);

    // Return accessToken and expiresIn along with onboarding status
    return {
      ...response,
      accessToken,
      expiresIn,
    };
  }

  /**
   * Token Recovery - GET /auth/token
   * Public endpoint - used for token recovery on page reload
   * Reads refresh token from httpOnly cookie and returns new accessToken
   * Does NOT rotate the refresh token (use POST /auth/refresh for rotation)
   */
  @Get('token')
  @Public()
  @ApiGetToken()
  async getToken(@Req() request: FastifyRequest): Promise<{ accessToken: string; expiresIn: number }> {
    const refreshToken = request.cookies?.[getRefreshCookieName()];

    this.logger.log('GET /auth/token - Recovering session from cookie');

    // Service layer handles all validation including missing/invalid refresh token
    return await this.sessionService.recoverSession(refreshToken);
  }

  /**
   * User login
   * POST /auth/login
   * Creates unified cloud session with accessToken + refreshToken
   * Sets refreshToken in httpOnly cookie, returns accessToken to frontend
   */
  @Post('login')
  @Public()
  @ApiLogin()
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);

    // Authenticate user and get response (refreshToken returned separately for cookie)
    const { refreshToken, ...response } = await this.authService.login(loginDto, ipAddress, userAgent);

    // Set refresh token in httpOnly cookie (domain from REFRESH_COOKIE_DOMAIN env var)
    if (refreshToken) {
      reply.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());
    }

    return response;
  }

  /**
   * Token Refresh - POST /auth/refresh
   * Reads refresh token from httpOnly cookie
   * Generates new accessToken AND rotates refreshToken for security
   * Updates cookie with new refreshToken
   */
  @Post('refresh')
  @Public()
  @ApiRefreshToken()
  async refreshToken(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const refreshToken = request.cookies?.[getRefreshCookieName()];

    this.logger.log('POST /auth/refresh - Refreshing session with rotation');

    // Service layer handles all validation including missing/invalid refresh token
    const result = await this.sessionService.refreshSession(refreshToken);

    // Update cookie with rotated refresh token (domain from REFRESH_COOKIE_DOMAIN env var)
    reply.setCookie(getRefreshCookieName(), result.refreshToken, getRefreshCookieOptionsFromConfig());

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }

  /**
   * Logout from current device
   * POST /auth/logout
   * Requires: JWT access token (protected by VrittiAuthGuard)
   * Invalidates session and clears refresh token cookie
   *
   * Note on authentication flow:
   * 1. VrittiAuthGuard validates the JWT token (signature, expiration, token binding)
   *    - This is cryptographic validation only, no database query
   *    - Sets request.user = { id: userId } for downstream use
   * 2. SessionService.invalidateSession() queries the database to find and deactivate the session
   *    - This database lookup is necessary (not duplicate) because the guard doesn't query sessions
   *    - We look up by accessToken to invalidate only THIS device's session
   *
   * The guard provides authentication, the service provides session state management.
   */
  @Post('logout')
  @ApiLogout()
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '') || '';

    await this.authService.logout(accessToken);

    // Clear refresh token cookie
    reply.clearCookie(getRefreshCookieName(), { path: '/' });

    return {
      message: 'Successfully logged out',
    };
  }

  /**
   * Logout from all devices
   * POST /auth/logout-all
   * Requires: JWT access token (protected by VrittiAuthGuard)
   * Invalidates all sessions and clears refresh token cookie
   */
  @Post('logout-all')
  @ApiLogoutAll()
  async logoutAll(
    @UserId() userId: string,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ message: string }> {
    const count = await this.authService.logoutAll(userId);

    // Clear refresh token cookie
    reply.clearCookie(getRefreshCookieName(), { path: '/' });

    return {
      message: `Successfully logged out from ${count} device(s)`,
    };
  }

  /**
   * Get current user authentication status
   * GET /auth/me
   * Public endpoint - checks authentication via httpOnly cookie
   *
   * Returns { isAuthenticated: true, user, accessToken, expiresIn } if valid session
   * Returns { isAuthenticated: false } if no valid session (no 401 error)
   *
   * This enables the frontend to:
   * 1. Check auth status on page load without needing an in-memory token
   * 2. Recover session from httpOnly cookie
   * 3. Get user data in a single request
   */
  @Get('me')
  @Public()
  @ApiGetCurrentUser()
  async getCurrentUser(@Req() request: FastifyRequest): Promise<AuthStatusResponseDto> {
    const refreshToken = request.cookies?.[getRefreshCookieName()];

    this.logger.log('GET /auth/me - Checking authentication status');

    if (!refreshToken) {
      this.logger.log('No refresh token cookie - unauthenticated');
      return new AuthStatusResponseDto({ isAuthenticated: false });
    }

    try {
      // Try to recover session from refresh token
      const { accessToken, expiresIn } = await this.sessionService.recoverSession(refreshToken);

      // Get session to find userId (use OrThrow variant - exception caught below)
      const session = await this.sessionService.getSessionByRefreshTokenOrThrow(refreshToken);
      const user = await this.userService.findById(session.userId);

      this.logger.log(`Session recovered for user: ${session.userId} - authenticated`);

      return new AuthStatusResponseDto({
        isAuthenticated: true,
        user,
        accessToken,
        expiresIn,
      });
    } catch (error) {
      this.logger.log(
        `Session recovery failed: ${error instanceof Error ? error.message : 'Unknown error'} - unauthenticated`,
      );
      return new AuthStatusResponseDto({ isAuthenticated: false });
    }
  }

  // ============================================================================
  // Password Reset Endpoints
  // ============================================================================

  /**
   * Request password reset
   * POST /auth/forgot-password
   * Sends a 6-digit OTP to the user's email
   */
  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiForgotPassword()
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /auth/forgot-password - Email: ${forgotPasswordDto.email}`);
    return this.passwordResetService.requestPasswordReset(forgotPasswordDto.email);
  }

  /**
   * Verify password reset OTP
   * POST /auth/verify-reset-otp
   * Validates the OTP and returns a reset token
   */
  @Post('verify-reset-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyResetOtp()
  async verifyResetOtp(@Body() verifyResetOtpDto: VerifyResetOtpDto): Promise<{ resetToken: string }> {
    this.logger.log(`POST /auth/verify-reset-otp - Email: ${verifyResetOtpDto.email}`);
    return this.passwordResetService.verifyResetOtp(verifyResetOtpDto.email, verifyResetOtpDto.otp);
  }

  /**
   * Reset password
   * POST /auth/reset-password
   * Sets a new password using the reset token
   */
  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiResetPassword()
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    this.logger.log('POST /auth/reset-password');
    return this.passwordResetService.resetPassword(resetPasswordDto.resetToken, resetPasswordDto.newPassword);
  }

  /**
   * Change password
   * POST /auth/password/change
   * Requires: JWT access token (protected by VrittiAuthGuard)
   * Validates current password before updating to new password
   */
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiChangePassword()
  async changePassword(@UserId() userId: string, @Body() dto: ChangePasswordDto): Promise<{ message: string }> {
    this.logger.log(`POST /auth/password/change - Changing password for user: ${userId}`);

    await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);

    return { message: 'Password changed successfully' };
  }

  /**
   * List active sessions
   * GET /auth/sessions
   * Requires: JWT access token (protected by VrittiAuthGuard)
   * Returns all active sessions for the authenticated user
   */
  @Get('sessions')
  @ApiGetSessions()
  async getSessions(@UserId() userId: string, @Req() request: FastifyRequest): Promise<SessionResponseDto[]> {
    this.logger.log(`GET /auth/sessions - Fetching sessions for user: ${userId}`);

    // Get current access token from request
    const authHeader = request.headers.authorization;
    const currentAccessToken = authHeader?.replace('Bearer ', '') || '';

    // Get all active sessions
    const sessions = await this.sessionService.getUserActiveSessions(userId);

    // Transform to response DTOs
    return sessions.map((session) => SessionResponseDto.from(session, currentAccessToken));
  }

  /**
   * Revoke a specific session
   * DELETE /auth/sessions/:id
   * Requires: JWT access token (protected by VrittiAuthGuard)
   * Invalidates a specific session by ID (cannot revoke current session)
   */
  @Delete('sessions/:id')
  @ApiRevokeSession()
  async revokeSession(
    @UserId() userId: string,
    @Param('id') sessionId: string,
    @Req() request: FastifyRequest,
  ): Promise<{ message: string }> {
    this.logger.log(`DELETE /auth/sessions/${sessionId} - Revoking session for user: ${userId}`);

    // Get current access token
    const authHeader = request.headers.authorization;
    const currentAccessToken = authHeader?.replace('Bearer ', '') || '';

    // Find the current session
    const currentSession = await this.sessionService.validateAccessToken(currentAccessToken);

    // Prevent revoking current session
    if (currentSession.id === sessionId) {
      throw new BadRequestException('sessionId', 'You cannot revoke your current session. Use logout instead.');
    }

    // Find all sessions for the user
    const sessions = await this.sessionService.getUserActiveSessions(userId);
    const targetSession = sessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      throw new NotFoundException(
        'The session you are trying to revoke does not exist or has already been revoked.',
      );
    }

    // Verify session belongs to user
    if (targetSession.userId !== userId) {
      throw new UnauthorizedException('You do not have permission to revoke this session.');
    }

    // Invalidate the session
    await this.sessionService.invalidateSession(targetSession.accessToken);

    this.logger.log(`Session ${sessionId} revoked for user: ${userId}`);

    return { message: 'Session revoked successfully' };
  }
}
