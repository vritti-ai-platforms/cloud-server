import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@vritti/api-sdk';
import { ChannelTypeValues, InboxStatusValues } from '@/db/schema';
import { InboxResponseDto } from '../dto/entity/inbox-response.dto';
import type { WhatsAppEmbeddedSignupDto } from '../dto/request/whatsapp-embedded-signup.dto';
import type { WhatsAppConfigResponseDto } from '../dto/response/whatsapp-config-response.dto';
import type { WhatsAppEmbeddedSignupResponseDto } from '../dto/response/whatsapp-embedded-signup-response.dto';
import { InboxRepository } from '../repositories/inbox.repository';

// ============================================================================
// Facebook API Response Types
// ============================================================================

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
}

interface FacebookApiErrorResponse {
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

interface WhatsAppEmbeddedSignupConfig {
  appId: string;
  appSecret: string;
  configId: string;
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class WhatsAppEmbeddedSignupService {
  private readonly logger = new Logger(WhatsAppEmbeddedSignupService.name);
  private readonly config: WhatsAppEmbeddedSignupConfig | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly inboxRepository: InboxRepository,
  ) {
    this.config = this.loadConfig();
  }

  // ===========================================================================
  // Configuration
  // ===========================================================================

  // Loads WhatsApp Embedded Signup configuration from environment variables
  private loadConfig(): WhatsAppEmbeddedSignupConfig | null {
    try {
      const appId = this.configService.getOrThrow<string>('WHATSAPP_APP_ID');
      const appSecret = this.configService.getOrThrow<string>('WHATSAPP_APP_SECRET');
      const configId = this.configService.getOrThrow<string>('WHATSAPP_CONFIG_ID');

      return { appId, appSecret, configId };
    } catch {
      this.logger.warn(
        'WhatsApp Embedded Signup environment variables are not configured. WhatsApp signup endpoints will not function.',
      );
      return null;
    }
  }

  // Returns the loaded config or throws if not configured
  private getConfigOrThrow(): WhatsAppEmbeddedSignupConfig {
    if (!this.config) {
      throw new BadRequestException(
        'WhatsApp Embedded Signup is not configured. Please set the required environment variables.',
      );
    }
    return this.config;
  }

  // ===========================================================================
  // Public Config
  // ===========================================================================

  // Returns public config (appId, configId) for the frontend to initialize the Facebook JS SDK
  getPublicConfig(): WhatsAppConfigResponseDto {
    const config = this.getConfigOrThrow();
    return { appId: config.appId, configId: config.configId };
  }

  // ===========================================================================
  // Embedded Signup Flow
  // ===========================================================================

  // Orchestrates the full embedded signup: exchange code, fetch phone details, create inbox
  async processEmbeddedSignup(
    tenantId: string,
    dto: WhatsAppEmbeddedSignupDto,
  ): Promise<WhatsAppEmbeddedSignupResponseDto> {
    // Step 1: Exchange authorization code for access token
    const accessToken = await this.exchangeCodeForToken(dto.code);

    // Step 2: Fetch phone number details from WhatsApp Cloud API
    const phoneDetails = await this.fetchPhoneNumberDetails(dto.phoneNumberId, accessToken);

    // Step 3: Build channel config
    const channelConfig = {
      accessToken,
      phoneNumberId: dto.phoneNumberId,
      businessAccountId: dto.wabaId,
      displayPhoneNumber: phoneDetails.displayPhoneNumber,
      verifiedName: phoneDetails.verifiedName,
      verifyToken: this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN', ''),
    };

    // Step 4: Check for existing inbox (reconnection support)
    const existingInbox = await this.inboxRepository.findByWhatsAppPhoneNumberId(dto.phoneNumberId);

    let inboxId: string;

    if (existingInbox && existingInbox.tenantId === tenantId) {
      // Reconnect: update existing inbox with new tokens
      await this.inboxRepository.updateChannelConfig(existingInbox.id, { ...channelConfig });
      inboxId = existingInbox.id;
      this.logger.log(`Reconnected existing WhatsApp inbox ${inboxId} for tenant ${tenantId}`);
    } else {
      // Create new inbox
      const inbox = await this.inboxRepository.create({
        tenantId,
        name: phoneDetails.verifiedName || phoneDetails.displayPhoneNumber,
        channelType: ChannelTypeValues.WHATSAPP,
        status: InboxStatusValues.ACTIVE,
        channelConfig,
      });
      inboxId = inbox.id;
      this.logger.log(`Created new WhatsApp inbox ${inboxId} for tenant ${tenantId}`);
    }

    // Step 5: Subscribe app to WABA webhooks (best-effort)
    await this.subscribeApp(dto.wabaId, accessToken);

    // Step 6: Return response
    const savedInbox = await this.inboxRepository.findById(inboxId);
    return {
      inbox: InboxResponseDto.from(savedInbox!),
      message: 'WhatsApp inbox connected successfully.',
    };
  }

  // ===========================================================================
  // Token Exchange
  // ===========================================================================

  // Exchanges the authorization code from FB.login() for an access token
  private async exchangeCodeForToken(code: string): Promise<string> {
    const config = this.getConfigOrThrow();

    const params = new URLSearchParams({
      client_id: config.appId,
      client_secret: config.appSecret,
      code,
    });

    const response = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?${params.toString()}`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Facebook token exchange failed (HTTP ${response.status}): ${errorText}`);
      throw new BadRequestException('Failed to exchange authorization code for access token.');
    }

    const data = (await response.json()) as FacebookTokenResponse | FacebookApiErrorResponse;

    if ('error' in data) {
      this.logger.error(`Facebook token exchange error: ${data.error.message}`);
      throw new BadRequestException(`Token exchange failed: ${data.error.message}`);
    }

    return data.access_token;
  }

  // ===========================================================================
  // Phone Number Details
  // ===========================================================================

  // Fetches display phone number and verified name from the WhatsApp Cloud API
  private async fetchPhoneNumberDetails(
    phoneNumberId: string,
    accessToken: string,
  ): Promise<{ displayPhoneNumber: string; verifiedName: string }> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData?.error?.message || `HTTP ${response.status}`;
        this.logger.error(`Phone number details fetch failed: ${errorMsg}`);
        throw new BadRequestException(
          `Could not fetch phone number details: ${errorMsg}`,
        );
      }

      const data = await response.json();

      return {
        displayPhoneNumber: data.display_phone_number || '',
        verifiedName: data.verified_name || '',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(`Failed to fetch phone number details: ${err.message}`);
      throw new BadRequestException(
        'Could not connect to the WhatsApp Cloud API. Please try again.',
      );
    }
  }

  // ===========================================================================
  // App Subscription
  // ===========================================================================

  // Subscribes the app to the WABA for webhook notifications (best-effort)
  private async subscribeApp(wabaId: string, accessToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${wabaId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.warn(
          `WhatsApp app subscription failed for WABA ${wabaId} (HTTP ${response.status}): ${errorText}`,
        );
        return;
      }

      const data = (await response.json()) as { success: boolean } | FacebookApiErrorResponse;

      if ('error' in data) {
        this.logger.warn(
          `WhatsApp app subscription error for WABA ${wabaId}: ${data.error.message}`,
        );
        return;
      }

      this.logger.log(`WhatsApp app subscription successful for WABA ${wabaId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.warn(
        `WhatsApp app subscription request failed for WABA ${wabaId}: ${err.message}`,
      );
    }
  }
}
