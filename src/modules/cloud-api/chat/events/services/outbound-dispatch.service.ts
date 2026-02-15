import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CHAT_EVENTS, type NewMessageEvent } from '../chat.events';
import { ConversationRepository } from '../../conversations/repositories/conversation.repository';
import { MessageRepository } from '../../messages/repositories/message.repository';
import { InboxRepository } from '../../inboxes/repositories/inbox.repository';
import { InstagramOAuthService } from '../../inboxes/services/instagram-oauth.service';
import { ChannelTypeValues, type Inbox, type ContactInbox } from '@/db/schema';

// ============================================================================
// Telegram API Types
// ============================================================================

interface TelegramSendMessageResponse {
  ok: boolean;
  description?: string;
  result?: { message_id: number };
}

// ============================================================================
// Instagram API Types
// ============================================================================

interface InstagramChannelConfig {
  accessToken: string;
  pageId?: string;
  instagramId?: string;
  instagramUserId?: string;
  username?: string;
  tokenExpiresAt?: string;
  verifyToken?: string;
}

interface InstagramSendMessageSuccessResponse {
  recipient_id: string;
  message_id: string;
}

interface InstagramSendMessageErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbrequest_id?: string;
  };
}

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class OutboundDispatchService {
  private readonly logger = new Logger(OutboundDispatchService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly inboxRepository: InboxRepository,
    private readonly instagramOAuthService: InstagramOAuthService,
  ) {}

  // ===========================================================================
  // Event Handler
  // ===========================================================================

  /**
   * Listens for new messages and dispatches agent replies to the external channel.
   * Only processes outbound messages (sent by agents, not contacts).
   */
  @OnEvent(CHAT_EVENTS.NEW_MESSAGE)
  async handleOutboundMessage(payload: NewMessageEvent): Promise<void> {
    try {
      const { tenantId, conversationId, message } = payload;

      // Only dispatch agent messages, not incoming contact messages
      if (message.isFromContact) {
        return;
      }

      const conversation = await this.conversationRepository.findByIdAndTenantId(
        conversationId,
        tenantId,
      );

      if (!conversation) {
        this.logger.warn(
          `Conversation ${conversationId} not found for tenant ${tenantId}, skipping outbound dispatch`,
        );
        return;
      }

      // findByIdAndTenantId loads inbox and contactInbox relations via `with`,
      // but the base return type does not reflect them, so we assert here.
      const conversationWithRelations = conversation as typeof conversation & {
        inbox: Inbox;
        contactInbox: ContactInbox;
      };

      const { inbox, contactInbox } = conversationWithRelations;

      if (!inbox || !contactInbox) {
        this.logger.warn(
          `Conversation ${conversationId} is missing inbox or contactInbox relation, skipping outbound dispatch`,
        );
        return;
      }

      switch (inbox.channelType) {
        case ChannelTypeValues.TELEGRAM:
          await this.dispatchTelegram(message.id, message.content, inbox.channelConfig, contactInbox.sourceId);
          break;

        case ChannelTypeValues.WHATSAPP:
          this.logger.log(`Outbound WhatsApp delivery not yet implemented for conversation ${conversationId}`);
          break;

        case ChannelTypeValues.INSTAGRAM:
          await this.dispatchInstagram(message.id, message.content, inbox.channelConfig, contactInbox.sourceId, inbox.id);
          break;

        default:
          this.logger.warn(`Unknown channel type: ${inbox.channelType}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        `Failed to dispatch outbound message for conversation ${payload.conversationId}: ${err.message}`,
        err.stack,
      );
    }
  }

  // ===========================================================================
  // Channel Dispatchers
  // ===========================================================================

  /**
   * Extracts the bot token from an inbox's channelConfig.
   * Returns null if the config is invalid or missing the botToken field.
   */
  private extractBotToken(channelConfig: unknown): string | null {
    if (
      typeof channelConfig === 'object' &&
      channelConfig !== null &&
      'botToken' in channelConfig &&
      typeof (channelConfig as Record<string, unknown>).botToken === 'string'
    ) {
      return (channelConfig as Record<string, unknown>).botToken as string;
    }
    return null;
  }

  /** Sends a text message to a Telegram chat via the Bot API and updates the message status */
  private async dispatchTelegram(
    messageId: string,
    content: string,
    channelConfig: unknown,
    chatId: string,
  ): Promise<void> {
    const botToken = this.extractBotToken(channelConfig);

    if (!botToken) {
      this.logger.error(`Missing or invalid botToken in channelConfig for message ${messageId}`);
      await this.messageRepository.updateStatus(messageId, 'FAILED');
      return;
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: content }),
        },
      );

      if (!response.ok) {
        this.logger.error(`Telegram API returned HTTP ${response.status} for message ${messageId}`);
        await this.messageRepository.updateStatus(messageId, 'FAILED');
        return;
      }

      const data: TelegramSendMessageResponse = await response.json();

      if (!data.ok) {
        this.logger.error(`Telegram sendMessage failed: ${data.description}`);
        await this.messageRepository.updateStatus(messageId, 'FAILED');
        return;
      }

      await this.messageRepository.updateStatus(messageId, 'DELIVERED', {
        externalMessageId: data.result?.message_id,
      });

      this.logger.log(`Telegram message delivered for message ${messageId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        `Telegram sendMessage request failed for message ${messageId}: ${err.message}`,
        err.stack,
      );

      try {
        await this.messageRepository.updateStatus(messageId, 'FAILED');
      } catch {
        this.logger.error(`Failed to update message ${messageId} status to FAILED`);
      }
    }
  }

  /**
   * Extracts the Instagram channel config from an inbox's channelConfig.
   * Supports both legacy (pageId) and OAuth (instagramUserId) configurations.
   * Returns null if the config is invalid or missing required fields.
   */
  private extractInstagramConfig(channelConfig: unknown): InstagramChannelConfig | null {
    if (typeof channelConfig !== 'object' || channelConfig === null) {
      return null;
    }

    const raw = channelConfig as Record<string, unknown>;

    if (typeof raw.accessToken !== 'string') {
      return null;
    }

    // Require at least one of pageId or instagramUserId to identify the sender
    const hasPageId = typeof raw.pageId === 'string';
    const hasInstagramUserId = typeof raw.instagramUserId === 'string';

    if (!hasPageId && !hasInstagramUserId) {
      return null;
    }

    return {
      accessToken: raw.accessToken as string,
      pageId: hasPageId ? (raw.pageId as string) : undefined,
      instagramId: typeof raw.instagramId === 'string' ? (raw.instagramId as string) : undefined,
      instagramUserId: hasInstagramUserId ? (raw.instagramUserId as string) : undefined,
      username: typeof raw.username === 'string' ? (raw.username as string) : undefined,
      tokenExpiresAt: typeof raw.tokenExpiresAt === 'string' ? (raw.tokenExpiresAt as string) : undefined,
      verifyToken: typeof raw.verifyToken === 'string' ? (raw.verifyToken as string) : undefined,
    };
  }

  /** Sends a text message via the Instagram Graph API and updates the message status */
  private async dispatchInstagram(
    messageId: string,
    content: string,
    channelConfig: unknown,
    recipientId: string,
    inboxId?: string,
  ): Promise<void> {
    const config = this.extractInstagramConfig(channelConfig);

    if (!config) {
      this.logger.error(`Missing or invalid Instagram config in channelConfig for message ${messageId}`);
      await this.messageRepository.updateStatus(messageId, 'FAILED');
      return;
    }

    // Lazy token refresh: if the token expires within 10 days, refresh it
    let accessToken = config.accessToken;
    if (config.tokenExpiresAt && inboxId) {
      accessToken = await this.maybeRefreshInstagramToken(inboxId, config);
    }

    // Use instagramUserId (OAuth flow) or pageId (legacy manual flow) as the sender
    const senderId = config.instagramUserId || config.pageId;

    try {
      const response = await fetch(
        `https://graph.instagram.com/v22.0/${senderId}/messages?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: content },
          }),
        },
      );

      if (!response.ok) {
        this.logger.error(`Instagram API returned HTTP ${response.status} for message ${messageId}`);
        await this.messageRepository.updateStatus(messageId, 'FAILED');
        return;
      }

      const data = (await response.json()) as
        | InstagramSendMessageSuccessResponse
        | InstagramSendMessageErrorResponse;

      if ('error' in data) {
        this.logger.error(
          `Instagram sendMessage failed (code ${data.error.code}): ${data.error.message}`,
        );
        await this.messageRepository.updateStatus(messageId, 'FAILED');
        return;
      }

      await this.messageRepository.updateStatus(messageId, 'DELIVERED', {
        externalMessageId: data.message_id,
      });

      this.logger.log(`Instagram message delivered for message ${messageId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.error(
        `Instagram sendMessage request failed for message ${messageId}: ${err.message}`,
        err.stack,
      );

      try {
        await this.messageRepository.updateStatus(messageId, 'FAILED');
      } catch {
        this.logger.error(`Failed to update message ${messageId} status to FAILED`);
      }
    }
  }

  // ===========================================================================
  // Instagram Token Refresh
  // ===========================================================================

  private static readonly TOKEN_REFRESH_THRESHOLD_MS = 10 * 24 * 60 * 60 * 1000; // 10 days

  /**
   * Checks if the Instagram token is within 10 days of expiry and refreshes it.
   * Returns the current or refreshed access token.
   */
  private async maybeRefreshInstagramToken(
    inboxId: string,
    config: InstagramChannelConfig,
  ): Promise<string> {
    if (!config.tokenExpiresAt) {
      return config.accessToken;
    }

    const expiresAt = new Date(config.tokenExpiresAt).getTime();
    const refreshThreshold = Date.now() + OutboundDispatchService.TOKEN_REFRESH_THRESHOLD_MS;

    if (expiresAt > refreshThreshold) {
      return config.accessToken;
    }

    try {
      this.logger.log(`Refreshing Instagram token for inbox ${inboxId} (expires ${config.tokenExpiresAt})`);

      const { accessToken, expiresIn } = await this.instagramOAuthService.refreshToken(config.accessToken);

      // Update the inbox with the new token
      const updatedConfig: Record<string, unknown> = {
        ...config,
        accessToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };

      await this.inboxRepository.updateChannelConfig(inboxId, updatedConfig);
      this.logger.log(`Instagram token refreshed successfully for inbox ${inboxId}`);

      return accessToken;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.warn(
        `Failed to refresh Instagram token for inbox ${inboxId}, using existing token: ${err.message}`,
      );
      return config.accessToken;
    }
  }
}
