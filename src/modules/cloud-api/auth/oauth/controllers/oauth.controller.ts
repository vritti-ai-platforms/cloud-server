import { Controller, Get, Logger, Param, Query, Redirect, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { getRefreshCookieName, getRefreshCookieOptionsFromConfig } from '../../root/services/session.service';
import { ApiHandleOAuthCallback, ApiInitiateOAuth } from '../docs/oauth.docs';
import { OAuthCallbackQueryDto } from '../dto/request/oauth-callback-query.dto';
import { OAuthService } from '../services/oauth.service';

@ApiTags('OAuth')
@Controller('auth/oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(private readonly oauthService: OAuthService) {}

  // Initiates the OAuth authorization flow by redirecting to the provider
  @Get(':provider')
  @Public()
  @Redirect()
  @ApiInitiateOAuth()
  async initiateOAuth(@Param('provider') provider: string): Promise<{ url: string }> {
    this.logger.log(`Initiating OAuth for: ${provider}`);
    return this.oauthService.initiateOAuth(provider);
  }

  // Handles the OAuth provider callback, sets refresh cookie, and redirects to frontend
  @Get(':provider/callback')
  @Public()
  @ApiHandleOAuthCallback()
  async handleOAuthCallback(
    @Param('provider') provider: string,
    @Query() dto: OAuthCallbackQueryDto,
    @Res() res: FastifyReply,
  ): Promise<void> {
    this.logger.log(`OAuth callback for: ${provider}`);
    const { redirectUrl, refreshToken } = await this.oauthService.handleCallback(provider, dto.code, dto.state);

    // Set refresh token cookie only on success (non-empty token)
    if (refreshToken) {
      res.setCookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptionsFromConfig());
    }

    res.redirect(redirectUrl, 302);
  }
}
