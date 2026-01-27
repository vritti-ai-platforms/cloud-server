import { Controller, Get, Logger, Param, Query, Redirect, Request, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BadRequestException, Onboarding, Public } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { OnboardingStepValues, SessionTypeValues } from '@/db/schema';
import type { OAuthResponseDto } from './oauth/dto/oauth-response.dto';
import { OAuthService } from './oauth/services/oauth.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig, SessionService } from './services/session.service';

/**
 * OAuth Controller
 * Handles OAuth authentication flows for all providers
 */
@ApiTags('Auth - OAuth')
@Controller('auth/oauth')
export class AuthOAuthController {
  private readonly logger = new Logger(AuthOAuthController.name);

  constructor(
    private readonly oauthService: OAuthService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle OAuth callback
   * GET /auth/oauth/:provider/callback
   * Public endpoint - receives authorization code from provider
   *
   * NOTE: This route MUST be defined BEFORE the generic :provider route
   * to ensure NestJS matches it correctly (routes are matched in definition order)
   */
  @Get(':provider/callback')
  @Public()
  @ApiOperation({
    summary: 'Handle OAuth callback',
    description: 'Receives the authorization code from the OAuth provider after user authorization. Exchanges the code for tokens and creates a session.',
  })
  @ApiParam({
    name: 'provider',
    description: 'OAuth provider name',
    example: 'google',
    enum: ['google', 'github', 'microsoft'],
  })
  @ApiQuery({
    name: 'code',
    description: 'Authorization code from OAuth provider',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with access token on success, or to error page on failure.',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing code or state parameter.',
  })
  async handleOAuthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!code || !state) {
      throw new BadRequestException(
        'Missing code or state parameter',
        'The authentication request is incomplete. Please try logging in again.',
      );
    }

    this.logger.log(`Handling OAuth callback for provider: ${provider}`);

    try {
      console.log('hi Sunvish');
      const response: OAuthResponseDto = await this.oauthService.handleCallback(provider, code, state);

      console.log('hi Sunvish1');

      // Determine session type based on onboarding status
      const isFullyOnboarded = response.user.onboardingStep === OnboardingStepValues.COMPLETE;
      const sessionType = isFullyOnboarded ? SessionTypeValues.CLOUD : SessionTypeValues.ONBOARDING;

      // Create session with refresh token
      const { accessToken, refreshToken, expiresIn } = await this.sessionService.createUnifiedSession(
        response.user.id,
        sessionType,
      );

      // Set refresh token cookie (domain from REFRESH_COOKIE_DOMAIN env var)
      res.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());

      // Redirect to frontend with access token
      const frontendUrl = this.getFrontendRedirectUrl(response, accessToken, expiresIn);
      res.redirect(frontendUrl, 302);
    } catch (error) {
      this.logger.error('OAuth callback error', error);

      // Redirect to frontend error page
      const errorUrl = this.getFrontendErrorUrl(error.message);
      res.redirect(errorUrl, 302);
    }
  }

  /**
   * Link OAuth provider to existing user
   * GET /auth/oauth/:provider/link
   * Requires onboarding token - user must be authenticated
   *
   * NOTE: This route MUST be defined BEFORE the generic :provider route
   */
  @Get(':provider/link')
  @Onboarding()
  @Redirect()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Link OAuth provider to existing account',
    description: 'Initiates the OAuth flow to link an additional OAuth provider to the authenticated user\'s account. Requires an onboarding token.',
  })
  @ApiParam({
    name: 'provider',
    description: 'OAuth provider name to link',
    example: 'google',
    enum: ['google', 'github', 'microsoft'],
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to OAuth provider authorization page.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized. Invalid or missing onboarding token.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid OAuth provider.',
  })
  async linkOAuthProvider(@Param('provider') provider: string, @Request() req): Promise<{ url: string }> {
    const userId = req.user.id;

    this.logger.log(`Linking OAuth provider: ${provider} for user: ${userId}`);

    const { url } = await this.oauthService.initiateOAuth(provider, userId);

    return { url };
  }

  /**
   * Initiate OAuth flow
   * GET /auth/oauth/:provider
   * Public endpoint - redirects to OAuth provider
   *
   * NOTE: This generic route MUST be defined LAST because NestJS matches routes
   * in definition order. If this were first, it would match all requests
   * (including /callback and /link) before more specific routes are checked.
   */
  @Get(':provider')
  @Public()
  @Redirect()
  @ApiOperation({
    summary: 'Initiate OAuth flow',
    description: 'Initiates the OAuth authentication flow by redirecting the user to the specified OAuth provider\'s authorization page.',
  })
  @ApiParam({
    name: 'provider',
    description: 'OAuth provider name',
    example: 'google',
    enum: ['google', 'github', 'microsoft'],
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to OAuth provider authorization page.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or unsupported OAuth provider.',
  })
  async initiateOAuth(@Param('provider') provider: string): Promise<{ url: string }> {
    this.logger.log(`Initiating OAuth flow for provider: ${provider}`);

    const { url } = await this.oauthService.initiateOAuth(provider);
    this.logger.log(`Redirecting to URL: ${url}`);

    return { url };
  }

  /**
   * Get frontend redirect URL after successful OAuth
   */
  private getFrontendRedirectUrl(response: OAuthResponseDto, accessToken: string, expiresIn: number): string {
    const baseUrl = this.configService.get<string>('FRONTEND_BASE_URL', 'http://cloud.localhost:3012');
    const params = new URLSearchParams({
      token: accessToken,
      expiresIn: String(expiresIn),
      isNewUser: String(response.isNewUser),
      requiresPassword: String(response.requiresPasswordSetup),
      step: response.user.onboardingStep,
    });

    return `${baseUrl}/onboarding/oauth-success?${params.toString()}`;
  }

  /**
   * Get frontend error URL
   */
  private getFrontendErrorUrl(errorMessage: string): string {
    const baseUrl = this.configService.get<string>('FRONTEND_BASE_URL', 'http://cloud.localhost:3012');
    const params = new URLSearchParams({
      error: errorMessage,
    });

    return `${baseUrl}/onboarding/oauth-error?${params.toString()}`;
  }
}
