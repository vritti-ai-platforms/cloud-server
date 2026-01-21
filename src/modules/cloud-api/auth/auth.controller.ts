import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Ip, Logger, Post, Req, Res } from '@nestjs/common';
import { Public, UserId } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionTypeValues } from '@/db/schema';
import type { OnboardingStatusResponseDto } from '../onboarding/dto/onboarding-status-response.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { UserService } from '../user/user.service';
import type { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AuthService } from './services/auth.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig, SessionService } from './services/session.service';

/**
 * Auth Controller
 * Handles user authentication, token refresh, and logout
 */
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
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

    // Set refresh token in httpOnly cookie (use getter functions to ensure config is loaded)
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
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);

    // Authenticate user and get response
    const response = await this.authService.login(loginDto, ipAddress, userAgent);

    // Set refresh token in httpOnly cookie (use getter functions to ensure config is loaded)
    if (response.refreshToken) {
      reply.setCookie(getRefreshCookieName(), response.refreshToken, getRefreshCookieOptionsFromConfig());
    }

    // Remove refreshToken from response (it's in the cookie)
    const { refreshToken: _, ...responseWithoutRefresh } = response;

    return responseWithoutRefresh as AuthResponseDto;
  }

  /**
   * Token Refresh - POST /auth/refresh
   * Reads refresh token from httpOnly cookie
   * Generates new accessToken AND rotates refreshToken for security
   * Updates cookie with new refreshToken
   */
  @Post('refresh')
  @Public()
  async refreshToken(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const refreshToken = request.cookies?.[getRefreshCookieName()];

    this.logger.log('POST /auth/refresh - Refreshing session with rotation');

    // Service layer handles all validation including missing/invalid refresh token
    const result = await this.sessionService.refreshSession(refreshToken);

    // Update cookie with rotated refresh token (use getter functions to ensure config is loaded)
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
   * Get current user info
   * GET /auth/me
   * Requires: JWT access token (protected by VrittiAuthGuard)
   *
   * Note: VrittiAuthGuard validates the JWT and attaches { id: userId } to request.user.
   * We use @UserId() decorator to extract the userId and fetch the full user data.
   * This is a single database query since the guard only validates the JWT signature,
   * not the user existence in the database.
   */
  @Get('me')
  async getCurrentUser(@UserId() userId: string): Promise<UserResponseDto> {
    return this.userService.findById(userId);
  }
}
