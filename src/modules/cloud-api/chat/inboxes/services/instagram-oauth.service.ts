import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@vritti/api-sdk';
import { ChannelTypeValues, InboxStatusValues } from '@/db/schema';
import { InboxResponseDto } from '../dto/entity/inbox-response.dto';
import { InboxRepository } from '../repositories/inbox.repository';

// ============================================================================
// Instagram API Response Types
// ============================================================================

interface InstagramShortLivedTokenResponse {
  access_token: string;
  user_id: number;
}

interface InstagramLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramRefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface InstagramProfile {
  id: string;
  username: string;
  userId: string;
  name: string;
  profilePictureUrl?: string;
}

interface InstagramProfileApiResponse {
  id: string;
  username: string;
  user_id: string;
  name: string;
  profile_picture_url?: string;
}

interface InstagramApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id?: string;
  };
}

// ============================================================================
// Configuration
// ============================================================================

interface OAuthStatePayload {
  sub: {
    tenantId: string;
    userId: string;
  };
}

interface InstagramOAuthConfig {
  appId: string;
  appSecret: string;
  callbackUrl: string;
  webhookVerifyToken: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class InstagramOAuthService {
  private readonly logger = new Logger(InstagramOAuthService.name);
  private readonly config: InstagramOAuthConfig | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly inboxRepository: InboxRepository,
  ) {
    this.config = this.loadConfig();
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  // Loads Instagram OAuth configuration from environment variables
  private loadConfig(): InstagramOAuthConfig | null {
    try {
      const appId = this.configService.getOrThrow<string>('INSTAGRAM_APP_ID');
      const appSecret = this.configService.getOrThrow<string>('INSTAGRAM_APP_SECRET');
      const callbackUrl = this.configService.getOrThrow<string>('INSTAGRAM_OAUTH_CALLBACK_URL');
      const webhookVerifyToken = this.configService.get<string>('INSTAGRAM_WEBHOOK_VERIFY_TOKEN', '');

      return { appId, appSecret, callbackUrl, webhookVerifyToken };
    } catch {
      this.logger.warn('Instagram OAuth environment variables are not configured.');
      return null;
    }
  }

  // Returns the loaded config or throws if not configured
  private getConfigOrThrow(): InstagramOAuthConfig {
    if (!this.config) {
      throw new UnauthorizedException('Instagram OAuth is not configured.');
    }
    return this.config;
  }

  // ===========================================================================
  // Authorization URL
  // ===========================================================================

  // Generates the Instagram OAuth URL with a signed JWT state token
  generateAuthorizationUrl(tenantId: string, userId: string): string {
    const config = this.getConfigOrThrow();

    const stateToken = this.jwtService.sign(
      { sub: { tenantId, userId } },
      {
        secret: this.configService.getOrThrow<string>('CSRF_HMAC_KEY'),
        expiresIn: '10m',
      },
    );

    const params = new URLSearchParams({
      client_id: config.appId,
      redirect_uri: config.callbackUrl,
      scope: 'instagram_business_basic,instagram_business_manage_messages',
      response_type: 'code',
      state: stateToken,
      enable_fb_login: '0',
      force_authentication: '1',
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  // ===========================================================================
  // OAuth Callback Processing
  // ===========================================================================

  // Processes the full OAuth callback: validates state, exchanges tokens, creates inbox
  async processOAuthCallback(
    code: string,
    state: string,
  ): Promise<{ inboxId: string }> {
    const { tenantId } = this.validateAndDecodeState(state);
    this.logger.log(`Instagram OAuth callback for tenant ${tenantId}`);

    const { accessToken, expiresIn } = await this.exchangeCodeForTokens(code);
    const profile = await this.fetchUserProfile(accessToken);
    this.logger.log(`Instagram profile fetched: @${profile.username} (ID: ${profile.userId})`);

    const channelConfig = {
      accessToken,
      instagramId: profile.id,
      instagramUserId: profile.userId,
      username: profile.username,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      verifyToken: this.getConfigOrThrow().webhookVerifyToken,
    };

    const existingInbox = await this.inboxRepository.findByTenantAndInstagramId(
      tenantId,
      profile.userId,
    );

    let inboxId: string;

    if (existingInbox) {
      await this.inboxRepository.updateChannelConfig(existingInbox.id, { ...channelConfig });
      inboxId = existingInbox.id;
      this.logger.log(`Reconnected existing Instagram inbox ${inboxId}`);
    } else {
      const inbox = await this.inboxRepository.create({
        tenantId,
        name: profile.name || `@${profile.username}`,
        channelType: ChannelTypeValues.INSTAGRAM,
        status: InboxStatusValues.ACTIVE,
        channelConfig,
      });
      inboxId = inbox.id;
      this.logger.log(`Created new Instagram inbox ${inboxId}`);
    }

    await this.subscribeWebhooks(profile.userId, accessToken);

    return { inboxId };
  }

  // ===========================================================================
  // State Validation
  // ===========================================================================

  // Validates and decodes the JWT state token from the OAuth callback
  private validateAndDecodeState(state: string): { tenantId: string; userId: string } {
    try {
      const payload = this.jwtService.verify<OAuthStatePayload>(state, {
        secret: this.configService.getOrThrow<string>('CSRF_HMAC_KEY'),
      });

      return {
        tenantId: payload.sub.tenantId,
        userId: payload.sub.userId,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired Instagram OAuth state token.');
    }
  }

  // ===========================================================================
  // Token Exchange
  // ===========================================================================

  // Exchanges authorization code for a long-lived token (~60 days)
  private async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; expiresIn: number }> {
    const config = this.getConfigOrThrow();
    const shortLivedToken = await this.exchangeCodeForShortLivedToken(config, code);
    const longLivedToken = await this.exchangeForLongLivedToken(config, shortLivedToken);

    return {
      accessToken: longLivedToken.access_token,
      expiresIn: longLivedToken.expires_in,
    };
  }

  // Exchanges the authorization code for a short-lived access token
  private async exchangeCodeForShortLivedToken(config: InstagramOAuthConfig, code: string): Promise<string> {
    const body = new URLSearchParams({
      client_id: config.appId,
      client_secret: config.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: config.callbackUrl,
      code,
    });

    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Instagram short-lived token exchange failed (HTTP ${response.status}): ${errorText}`);
      throw new Error('Failed to exchange authorization code for Instagram access token.');
    }

    const data = (await response.json()) as InstagramShortLivedTokenResponse | InstagramApiErrorResponse;
    if ('error' in data) throw new Error(`Instagram token exchange failed: ${data.error.message}`);

    return data.access_token;
  }

  // Exchanges a short-lived token for a long-lived token (~60 days)
  private async exchangeForLongLivedToken(
    config: InstagramOAuthConfig,
    shortLivedToken: string,
  ): Promise<InstagramLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'ig_exchange_token',
      client_secret: config.appSecret,
      access_token: shortLivedToken,
      client_id: config.appId,
    });

    const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Instagram long-lived token exchange failed (HTTP ${response.status}): ${errorText}`);
      throw new Error('Failed to exchange for long-lived Instagram access token.');
    }

    const data = (await response.json()) as InstagramLongLivedTokenResponse | InstagramApiErrorResponse;
    if ('error' in data) throw new Error(`Instagram long-lived token exchange failed: ${data.error.message}`);

    return data;
  }

  // ===========================================================================
  // User Profile
  // ===========================================================================

  // Fetches the Instagram user profile using the Graph API
  private async fetchUserProfile(accessToken: string): Promise<InstagramProfile> {
    const params = new URLSearchParams({
      fields: 'id,username,user_id,name,profile_picture_url',
      access_token: accessToken,
    });

    const response = await fetch(`https://graph.instagram.com/v22.0/me?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Instagram profile fetch failed (HTTP ${response.status}): ${errorText}`);
      throw new Error('Failed to fetch Instagram user profile.');
    }

    const data = (await response.json()) as InstagramProfileApiResponse | InstagramApiErrorResponse;
    if ('error' in data) throw new Error(`Failed to fetch Instagram profile: ${data.error.message}`);

    return {
      id: data.id,
      username: data.username,
      userId: data.user_id,
      name: data.name,
      profilePictureUrl: data.profile_picture_url,
    };
  }

  // ===========================================================================
  // Webhook Subscription
  // ===========================================================================

  // Subscribes the Instagram user to webhook notifications (best-effort)
  private async subscribeWebhooks(instagramUserId: string, accessToken: string): Promise<void> {
    try {
      const params = new URLSearchParams({
        subscribed_fields: 'messages',
        access_token: accessToken,
      });

      const response = await fetch(
        `https://graph.instagram.com/v22.0/${instagramUserId}/subscribed_apps?${params.toString()}`,
        { method: 'POST' },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(`Instagram webhook subscription failed (HTTP ${response.status}): ${errorText}`);
        return;
      }

      const data = (await response.json()) as { success: boolean } | InstagramApiErrorResponse;
      if ('error' in data) {
        this.logger.warn(`Instagram webhook subscription error: ${data.error.message}`);
        return;
      }

      this.logger.log(`Instagram webhook subscription successful for user ${instagramUserId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.warn(`Instagram webhook subscription failed: ${err.message}`);
    }
  }

  // ===========================================================================
  // Token Refresh
  // ===========================================================================

  // Refreshes a long-lived Instagram access token
  async refreshToken(currentToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const params = new URLSearchParams({
      grant_type: 'ig_refresh_token',
      access_token: currentToken,
    });

    const response = await fetch(`https://graph.instagram.com/refresh_access_token?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Instagram token refresh failed (HTTP ${response.status}): ${errorText}`);
      throw new Error('Failed to refresh Instagram access token.');
    }

    const data = (await response.json()) as InstagramRefreshTokenResponse | InstagramApiErrorResponse;
    if ('error' in data) throw new Error(`Instagram token refresh failed: ${data.error.message}`);

    return { accessToken: data.access_token, expiresIn: data.expires_in };
  }

  // Returns the configured webhook verify token
  getWebhookVerifyToken(): string {
    return this.getConfigOrThrow().webhookVerifyToken;
  }
}
