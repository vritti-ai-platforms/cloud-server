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
import { NotFoundException, Public, RefreshTokenCookie, UnauthorizedException, UserId } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionTypeValues } from '@/db/schema';
import type { OnboardingStatusResponseDto } from '../../../onboarding/root/dto/onboarding-status-response.dto';
import {
  ApiChangePassword,
  ApiForgotPassword,
  ApiGetCurrentUser,
  ApiGetSessions,
  ApiGetToken,
  ApiLogin,
  ApiLogout,
  ApiLogoutAll,
  ApiRefreshToken,
  ApiResetPassword,
  ApiRevokeSession,
  ApiSignup,
  ApiVerifyResetOtp,
} from '../docs/auth.docs';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ForgotPasswordDto, ResetPasswordDto, VerifyResetOtpDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { SessionResponseDto } from '../dto/session-response.dto';
import { SignupDto } from '../dto/signup.dto';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig, SessionService } from '../services/session.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  // Creates a new user account and initiates onboarding session
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

  // Recovers session from httpOnly cookie without rotating the refresh token
  @Get('token')
  @Public()
  @ApiGetToken()
  async getToken(@RefreshTokenCookie() refreshToken: string | undefined) {
    this.logger.log('GET /auth/token - Recovering session from cookie');
    return this.sessionService.recoverSession(refreshToken);
  }

  // Authenticates user credentials, returns access token or MFA challenge
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

  // Rotates refresh token and issues a new access token
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

  // Invalidates the current session and clears the refresh cookie
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

  // Invalidates all sessions across all devices for the current user
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

  // Returns auth status without throwing 401 -- always responds with isAuthenticated flag
  @Get('me')
  @Public()
  @ApiGetCurrentUser()
  async getCurrentUser(@RefreshTokenCookie() refreshToken: string | undefined) {
    this.logger.log('GET /auth/me - Checking authentication status');
    return this.authService.getAuthStatus(refreshToken);
  }

  // Sends a password reset OTP to the user's email address
  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiForgotPassword()
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
    this.logger.log(`POST /auth/forgot-password - Email: ${forgotPasswordDto.email}`);
    return this.passwordResetService.requestPasswordReset(forgotPasswordDto.email);
  }

  // Verifies the password reset OTP and returns a one-time reset token
  @Post('verify-reset-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiVerifyResetOtp()
  async verifyResetOtp(@Body() verifyResetOtpDto: VerifyResetOtpDto): Promise<{ resetToken: string }> {
    this.logger.log(`POST /auth/verify-reset-otp - Email: ${verifyResetOtpDto.email}`);
    return this.passwordResetService.verifyResetOtp(verifyResetOtpDto.email, verifyResetOtpDto.otp);
  }

  // Sets a new password using the verified reset token
  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiResetPassword()
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    this.logger.log('POST /auth/reset-password');
    return this.passwordResetService.resetPassword(resetPasswordDto.resetToken, resetPasswordDto.newPassword);
  }

  // Changes the authenticated user's password after verifying the current one
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiChangePassword()
  async changePassword(@UserId() userId: string, @Body() dto: ChangePasswordDto): Promise<{ message: string }> {
    this.logger.log(`POST /auth/password/change - Changing password for user: ${userId}`);

    await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);

    return { message: 'Password changed successfully' };
  }

  // Lists all active sessions for the authenticated user
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

  // Revokes a specific session by ID, preventing use of its tokens
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
      throw new NotFoundException('The session you are trying to revoke does not exist or has already been revoked.');
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
