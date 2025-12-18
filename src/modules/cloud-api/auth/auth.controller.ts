import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Get,
  Logger,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SessionTokenResponseDto } from './dto/session-token-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public, UnauthorizedException } from '@vritti/api-sdk';
import { OnboardingStatusResponseDto } from '../onboarding/dto/onboarding-status-response.dto';
import { User } from '@/db/schema';
import type { FastifyRequest, FastifyReply } from 'fastify';

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
   * Requires CSRF token in X-CSRF-Token header
   * Sets onboarding session cookie
   */
  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.OK)
  async signup(
    @Body() signupDto: SignupDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<OnboardingStatusResponseDto> {
    this.logger.log(`POST /auth/signup - Email: ${signupDto.email}`);

    // Create user and generate onboarding token
    const response = await this.authService.signup(signupDto);

    // Create onboarding session in database
    const { sessionId } = await this.sessionService.createOnboardingSession(
      response.userId,
      ipAddress,
      userAgent,
    );

    // Set signed httpOnly cookie with session ID
    reply.setCookie('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true,
      path: '/',
      maxAge: 604800000, // 7 days in milliseconds
    });

    this.logger.log(`Created onboarding session for user: ${response.userId}`);

    return response;
  }

  /**
   * Get session token (unified endpoint for both onboarding and cloud tokens)
   * GET /auth/token
   * Public endpoint - used for token recovery on page reload
   * Reads session ID from cookie and returns appropriate tokens based on session type
   */
  @Get('token')
  @Public()
  async getSessionToken(
    @Req() request: FastifyRequest,
  ): Promise<SessionTokenResponseDto> {
    const sessionId = request.cookies?.session;

    if (!sessionId) {
      throw new UnauthorizedException(
        'No session found',
        'No active session found. Please sign up or log in again.'
      );
    }

    this.logger.log(`GET /auth/token - Session: ${sessionId}`);

    return await this.sessionService.getSessionToken(sessionId);
  }

  /**
   * User login
   * POST /auth/login
   */
  @Post('login')
  @Public()
  async login(
    @Body() loginDto: LoginDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    return await this.authService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  @Post('refresh')
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    this.logger.log('Token refresh attempt');
    return await this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * Logout from current device
   * POST /auth/logout
   * Requires: JWT access token
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Req() request: FastifyRequest): Promise<{ message: string }> {
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '') || '';

    await this.authService.logout(accessToken);

    return {
      message: 'Successfully logged out',
    };
  }

  /**
   * Logout from all devices
   * POST /auth/logout-all
   * Requires: JWT access token
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(@Req() request: AuthenticatedRequest): Promise<{ message: string }> {
    const userId = request.user.id; // Set by JwtAuthGuard

    const count = await this.authService.logoutAll(userId);

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
