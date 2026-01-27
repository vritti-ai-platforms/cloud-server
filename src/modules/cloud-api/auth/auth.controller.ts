import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Ip, Logger, Post, Req, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
@ApiTags('Auth')
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
  @ApiOperation({
    summary: 'User signup',
    description: 'Creates a new user account and initiates the onboarding flow. Returns an access token and sets a refresh token in an httpOnly cookie.',
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
    description: 'Recovers the session by reading the refresh token from the httpOnly cookie and returns a new access token. Does not rotate the refresh token.',
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
    description: 'Authenticates the user with email and password. Returns an access token and sets a refresh token in an httpOnly cookie.',
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

    // Authenticate user and get response
    const response = await this.authService.login(loginDto, ipAddress, userAgent);

    // Set refresh token in httpOnly cookie (domain from REFRESH_COOKIE_DOMAIN env var)
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
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Generates a new access token and rotates the refresh token for enhanced security. Reads refresh token from httpOnly cookie and updates it with the new rotated token.',
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
    description: 'Invalidates the current session and clears the refresh token cookie. Only logs out from the current device.',
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
    description: 'Invalidates all active sessions for the current user across all devices and clears the refresh token cookie.',
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user information',
    description: 'Returns the profile information of the currently authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing access token.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  async getCurrentUser(@UserId() userId: string): Promise<UserResponseDto> {
    return this.userService.findById(userId);
  }
}
