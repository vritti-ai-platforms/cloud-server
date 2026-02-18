import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, SkipCsrf, Tenant, type TenantInfo, UserId } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { ApiInstagramAuthorize, ApiInstagramCallback } from '../docs/instagram-oauth.docs';
import { InstagramOAuthService } from '../services/instagram-oauth.service';

const FRONTEND_REDIRECT_BASE = 'https://cloud.local.vrittiai.com:3012/integrations/inboxes';

@ApiTags('Inboxes')
@Controller('inboxes/instagram')
export class InstagramOAuthController {
  private readonly logger = new Logger(InstagramOAuthController.name);

  constructor(private readonly instagramOAuthService: InstagramOAuthService) {}

  // Generates the Instagram OAuth authorization URL for the current tenant
  @Get('authorize')
  @ApiBearerAuth()
  @ApiInstagramAuthorize()
  authorize(
    @Tenant() tenant: TenantInfo,
    @UserId() userId: string,
  ): { url: string } {
    this.logger.log(`GET /inboxes/instagram/authorize for tenant ${tenant.id}`);
    const url = this.instagramOAuthService.generateAuthorizationUrl(tenant.id, userId);
    return { url };
  }

  // Handles the Instagram OAuth callback redirect and creates/reconnects an inbox
  @Get('callback')
  @Public()
  @SkipCsrf()
  @ApiInstagramCallback()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_reason') errorReason: string | undefined,
    @Res() res: FastifyReply,
  ): Promise<void> {
    this.logger.log('GET /inboxes/instagram/callback');

    if (error) {
      this.logger.warn(`Instagram OAuth denied: ${errorReason || error}`);
      res.redirect(this.buildRedirectUrl('error', errorReason || error), 302);
      return;
    }

    if (!code || !state) {
      this.logger.warn('Instagram OAuth callback missing code or state');
      res.redirect(this.buildRedirectUrl('error', 'Missing authorization code or state parameter.'), 302);
      return;
    }

    try {
      const { inboxId } = await this.instagramOAuthService.processOAuthCallback(code, state);
      res.redirect(this.buildRedirectUrl('success', undefined, inboxId), 302);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Instagram OAuth callback failed: ${message}`);
      res.redirect(this.buildRedirectUrl('error', message), 302);
    }
  }

  // Builds the frontend redirect URL for success or error outcomes
  private buildRedirectUrl(status: 'success' | 'error', message?: string, inboxId?: string): string {
    const params = new URLSearchParams({ instagram: status });
    if (message) params.set('message', message);
    if (inboxId) params.set('inboxId', inboxId);
    return `${FRONTEND_REDIRECT_BASE}?${params.toString()}`;
  }
}
