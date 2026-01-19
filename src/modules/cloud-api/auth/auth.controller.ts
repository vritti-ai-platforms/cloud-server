import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Public, UnauthorizedException, UserId } from '@vritti/api-sdk';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionTypeValues, type User } from '@/db/schema';
import type { OnboardingStatusResponseDto } from '../onboarding/dto/onboarding-status-response.dto';
import type { AuthResponseDto } from './dto/auth-response.dto';
import type { LoginDto } from './dto/login.dto';
import type { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './services/auth.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig, SessionService } from './services/session.service';

/** Request with authenticated user from JwtAuthGuard */
interface AuthenticatedRequest extends FastifyRequest {
  user: User;
}

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

    if (!refreshToken) {
      throw new UnauthorizedException('No session found', 'No active session found. Please sign up or log in again.');
    }

    this.logger.log('GET /auth/token - Recovering session from cookie');

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

    if (!refreshToken) {
      throw new UnauthorizedException('No session found', 'No active session found. Please sign up or log in again.');
    }

    this.logger.log('POST /auth/refresh - Refreshing session with rotation');

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
   * Requires: JWT access token
   * Invalidates session and clears refresh token cookie
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
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
   * Requires: JWT access token
   * Invalidates all sessions and clears refresh token cookie
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
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
   * Requires: JWT access token
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@Req() request: AuthenticatedRequest): Promise<User> {
    return request.user; // User info set by JwtAuthGuard
  }
}
