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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'User signup',
    description:
      'Creates a new user account and initiates the onboarding flow. Returns an access token and sets a refresh token in an httpOnly cookie.',
  })
  @ApiBody({ type: SignupDto })
  @ApiResponse({
    status: 200,
    description: 'User created successfully. Returns onboarding status and access token.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error.',
  })
  @ApiResponse({
    status: 409,
    description: 'User with this email already exists.',
  })
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
  @ApiOperation({
    summary: 'Recover session token',
    description:
      'Recovers the session by reading the refresh token from the httpOnly cookie and returns a new access token. Does not rotate the refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Session recovered successfully. Returns new access token.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'JWT access token' },
        expiresIn: { type: 'number', description: 'Token expiry in seconds' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
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
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates the user with email and password. Returns an access token and sets a refresh token in an httpOnly cookie.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login successful. Returns access token and user information.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
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
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Generates a new access token and rotates the refresh token for enhanced security. Reads refresh token from httpOnly cookie and updates it with the new rotated token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Token refreshed successfully. Returns new access token.',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'New JWT access token' },
        expiresIn: { type: 'number', description: 'Token expiry in seconds' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout from current device',
    description:
      'Invalidates the current session and clears the refresh token cookie. Only logs out from the current device.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully logged out.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully logged out' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing access token.',
  })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout from all devices',
    description:
      'Invalidates all active sessions for the current user across all devices and clears the refresh token cookie.',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully logged out from all devices.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Successfully logged out from 3 device(s)' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing access token.',
  })
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
  @ApiOperation({
    summary: 'Get current user authentication status',
    description:
      'Checks authentication status via httpOnly cookie. Returns user data and access token if authenticated, or { isAuthenticated: false } if not. Never returns a 401 error.',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication status returned.',
    type: AuthStatusResponseDto,
  })
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
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset OTP to the provided email address. Always returns success to prevent email enumeration.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists).',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'If an account with that email exists, a password reset code has been sent.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.',
  })
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
  @ApiOperation({
    summary: 'Verify password reset OTP',
    description: 'Validates the OTP sent to the user email and returns a reset token for setting a new password.',
  })
  @ApiBody({ type: VerifyResetOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP verified successfully. Returns reset token.',
    schema: {
      type: 'object',
      properties: {
        resetToken: { type: 'string', description: 'Token to use for resetting the password' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'No reset request found or OTP expired.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid OTP.',
  })
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
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Sets a new password using the reset token received after OTP verification. Invalidates all active sessions.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Password has been reset successfully. Please login with your new password.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token.',
  })
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
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description: "Change the authenticated user's password. Requires current password verification.",
  })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Password changed successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid current password or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List active sessions',
    description: 'Get all active sessions for the authenticated user across all devices.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
    type: [SessionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke a specific session',
    description: 'Invalidate a specific session by ID. Cannot revoke the current session.',
  })
  @ApiParam({
    name: 'id',
    description: 'Session ID to revoke',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Session revoked successfully' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Cannot revoke current session' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 404, description: 'Session not found' })
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
        'Session not found',
        'The session you are trying to revoke does not exist or has already been revoked.',
      );
    }

    // Verify session belongs to user
    if (targetSession.userId !== userId) {
      throw new UnauthorizedException('Unauthorized', 'You do not have permission to revoke this session.');
    }

    // Invalidate the session
    await this.sessionService.invalidateSession(targetSession.accessToken);

    this.logger.log(`Session ${sessionId} revoked for user: ${userId}`);

    return { message: 'Session revoked successfully' };
  }
}
