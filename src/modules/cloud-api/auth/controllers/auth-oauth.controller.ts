import { Controller, Get, Logger, Param, Query, Redirect, Request, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { ApiHandleOAuthCallback, ApiLinkOAuthProvider, ApiInitiateOAuth } from '../docs/auth-oauth.docs';
import { BadRequestException, Onboarding, Public } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { OnboardingStepValues, SessionTypeValues } from '@/db/schema';
import type { OAuthResponseDto } from '../oauth/dto/oauth-response.dto';
import { OAuthService } from '../oauth/services/oauth.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig, SessionService } from '../services/session.service';

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
  @ApiHandleOAuthCallback()
  async handleOAuthCallback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (!code || !state) {
      throw new BadRequestException({
        label: 'Incomplete OAuth Request',
        detail: 'The authentication request is incomplete. Please try logging in again.',
      });
    }

    this.logger.log(`Handling OAuth callback for provider: ${provider}`);

    try {
      const response: OAuthResponseDto = await this.oauthService.handleCallback(provider, code, state);

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

      // Redirect to frontend (token recovered via GET /auth/token using refresh cookie)
      const frontendUrl = this.getFrontendRedirectUrl(response);
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
  @ApiLinkOAuthProvider()
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
  @ApiInitiateOAuth()
  async initiateOAuth(@Param('provider') provider: string): Promise<{ url: string }> {
    this.logger.log(`Initiating OAuth flow for provider: ${provider}`);

    const { url } = await this.oauthService.initiateOAuth(provider);
    this.logger.log(`Redirecting to URL: ${url}`);

    return { url };
  }

  /**
   * Get frontend redirect URL after successful OAuth
   */
  private getFrontendRedirectUrl(response: OAuthResponseDto): string {
    const baseUrl = this.configService.get<string>('FRONTEND_BASE_URL', 'http://cloud.localhost:3012');
    const params = new URLSearchParams({
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
