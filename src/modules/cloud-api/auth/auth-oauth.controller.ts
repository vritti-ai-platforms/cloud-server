import { Controller, Get, Logger, Param, Query, Redirect, Request, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, Onboarding, Public } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { type OAuthProviderType, OAuthProviderTypeValues, OnboardingStepValues, SessionTypeValues } from '@/db/schema';
import type { OAuthResponseDto } from './oauth/dto/oauth-response.dto';
import { OAuthService } from './oauth/services/oauth.service';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig, SessionService } from './services/session.service';

/**
 * OAuth Controller
 * Handles OAuth authentication flows for all providers
 */
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
  async handleOAuthCallback(
    @Param('provider') providerStr: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const provider = this.validateProvider(providerStr);

    if (!code || !state) {
      throw new BadRequestException(
        'Missing code or state parameter',
        'The authentication request is incomplete. Please try logging in again.',
      );
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

      // Set refresh token cookie (use getter functions to ensure config is loaded)
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
  async linkOAuthProvider(@Param('provider') providerStr: string, @Request() req): Promise<{ url: string }> {
    const provider = this.validateProvider(providerStr);
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
  async initiateOAuth(@Param('provider') providerStr: string): Promise<{ url: string }> {
    const provider = this.validateProvider(providerStr);

    this.logger.log(`Initiating OAuth flow for provider: ${provider}`);

    const { url } = await this.oauthService.initiateOAuth(provider);
    this.logger.log(`Redirecting to URL: ${url}`);

    return { url };
  }

  /**
   * Validate and parse OAuth provider
   */
  private validateProvider(providerStr: string): OAuthProviderType {
    const upperProvider = providerStr.toUpperCase();

    if (!Object.values(OAuthProviderTypeValues).includes(upperProvider as OAuthProviderType)) {
      throw new BadRequestException(
        'provider',
        `Invalid OAuth provider: ${providerStr}`,
        'The selected login method is not supported. Please choose a different option.',
      );
    }

    return upperProvider as OAuthProviderType;
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
