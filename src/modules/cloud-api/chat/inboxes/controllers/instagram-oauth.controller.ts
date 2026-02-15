import { Controller, Get, Logger, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, SkipCsrf, Tenant, type TenantInfo, UserId } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { ChannelTypeValues, InboxStatusValues } from '@/db/schema';
import { ApiInstagramAuthorize, ApiInstagramCallback } from '../docs/instagram-oauth.docs';
import { InstagramOAuthService } from '../services/instagram-oauth.service';
import { InboxRepository } from '../repositories/inbox.repository';

// ============================================================================
// Instagram OAuth Channel Config
// ============================================================================

interface InstagramOAuthChannelConfig {
  accessToken: string;
  instagramId: string;
  instagramUserId: string;
  username: string;
  tokenExpiresAt: string;
  verifyToken: string;
}

// ============================================================================
// Frontend URLs
// ============================================================================

const FRONTEND_REDIRECT_BASE = 'https://cloud.local.vrittiai.com:3012/integrations/inboxes';

// ============================================================================
// Controller
// ============================================================================

@ApiTags('Inboxes')
@Controller('inboxes/instagram')
export class InstagramOAuthController {
  private readonly logger = new Logger(InstagramOAuthController.name);

  constructor(
    private readonly instagramOAuthService: InstagramOAuthService,
    private readonly inboxRepository: InboxRepository,
    private readonly configService: ConfigService,
  ) {}

  // ===========================================================================
  // GET /inboxes/instagram/authorize
  // ===========================================================================

  @Get('authorize')
  @ApiBearerAuth()
  @ApiInstagramAuthorize()
  async authorize(
    @Tenant() tenant: TenantInfo,
    @UserId() userId: string,
  ): Promise<{ url: string }> {
    this.logger.log(`GET /inboxes/instagram/authorize - Generating OAuth URL for tenant ${tenant.id}`);

    const url = this.instagramOAuthService.generateAuthorizationUrl(tenant.id, userId);
    return { url };
  }

  // ===========================================================================
  // GET /inboxes/instagram/callback
  // ===========================================================================

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
    this.logger.log('GET /inboxes/instagram/callback - Processing Instagram OAuth callback');

    // Handle user denial or Instagram error
    if (error) {
      const message = errorReason || error;
      this.logger.warn(`Instagram OAuth denied: ${message}`);
      res.redirect(this.buildErrorRedirectUrl(message), 302);
      return;
    }

    // Validate required parameters
    if (!code || !state) {
      this.logger.warn('Instagram OAuth callback missing code or state parameter');
      res.redirect(this.buildErrorRedirectUrl('Missing authorization code or state parameter.'), 302);
      return;
    }

    try {
      // Step 1: Validate state JWT and extract tenantId + userId
      const { tenantId, userId } = this.instagramOAuthService.validateAndDecodeState(state);
      this.logger.log(`Instagram OAuth callback for tenant ${tenantId}, user ${userId}`);

      // Step 2: Exchange authorization code for long-lived token
      const { accessToken, expiresIn } = await this.instagramOAuthService.exchangeCodeForTokens(code);

      // Step 3: Fetch Instagram user profile
      const profile = await this.instagramOAuthService.fetchUserProfile(accessToken);
      this.logger.log(`Instagram profile fetched: @${profile.username} (ID: ${profile.userId})`);

      // Step 4: Build channel config
      const channelConfig: InstagramOAuthChannelConfig = {
        accessToken,
        instagramId: profile.id,
        instagramUserId: profile.userId,
        username: profile.username,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        verifyToken: this.configService.get<string>('INSTAGRAM_WEBHOOK_VERIFY_TOKEN', ''),
      };

      // Step 5: Check for existing inbox (reconnection support)
      const existingInbox = await this.inboxRepository.findByTenantAndInstagramId(
        tenantId,
        profile.userId,
      );

      let inboxId: string;

      if (existingInbox) {
        // Reconnect: update existing inbox with new tokens
        await this.inboxRepository.updateChannelConfig(existingInbox.id, { ...channelConfig });
        inboxId = existingInbox.id;
        this.logger.log(`Reconnected existing Instagram inbox ${inboxId} for tenant ${tenantId}`);
      } else {
        // Create new inbox
        const inbox = await this.inboxRepository.create({
          tenantId,
          name: profile.name || `@${profile.username}`,
          channelType: ChannelTypeValues.INSTAGRAM,
          status: InboxStatusValues.ACTIVE,
          channelConfig,
        });
        inboxId = inbox.id;
        this.logger.log(`Created new Instagram inbox ${inboxId} for tenant ${tenantId}`);
      }

      // Step 6: Subscribe to webhooks (best-effort)
      await this.instagramOAuthService.subscribeWebhooks(profile.userId, accessToken);

      // Step 7: Redirect to frontend success page
      const successUrl = `${FRONTEND_REDIRECT_BASE}?instagram=success&inboxId=${inboxId}`;
      res.redirect(successUrl, 302);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(`Instagram OAuth callback failed: ${err.message}`, err.stack);

      res.redirect(this.buildErrorRedirectUrl(err.message), 302);
    }
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private buildErrorRedirectUrl(message: string): string {
    const params = new URLSearchParams({
      instagram: 'error',
      message,
    });

    return `${FRONTEND_REDIRECT_BASE}?${params.toString()}`;
  }
}
