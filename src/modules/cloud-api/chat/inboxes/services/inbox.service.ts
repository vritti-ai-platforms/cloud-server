import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@vritti/api-sdk';
import { ChannelTypeValues, InboxStatusValues } from '@/db/schema';
import { InboxResponseDto } from '../dto/entity/inbox-response.dto';
import type { CreateTelegramInboxDto } from '../dto/request/create-telegram-inbox.dto';
import type { CreateInstagramInboxDto } from '../dto/request/create-instagram-inbox.dto';
import type { CreateWhatsAppInboxDto } from '../dto/request/create-whatsapp-inbox.dto';
import { InboxRepository } from '../repositories/inbox.repository';

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly configService: ConfigService,
  ) {}

  // Creates a Telegram inbox with bot token configuration.
  // Validates the bot token against the Telegram API and auto-detects
  // the bot name if not provided by the user.
  async createTelegramInbox(
    tenantId: string,
    dto: CreateTelegramInboxDto,
  ): Promise<{ inbox: InboxResponseDto; message: string }> {
    const botInfo = await this.fetchTelegramBotInfo(dto.botToken);
    const inboxName = dto.name || botInfo.firstName;

    const inbox = await this.inboxRepository.create({
      tenantId,
      name: inboxName,
      channelType: ChannelTypeValues.TELEGRAM,
      status: InboxStatusValues.ACTIVE,
      channelConfig: { botToken: dto.botToken, botUsername: botInfo.username },
    });

    await this.setTelegramWebhook(dto.botToken, inbox.id);
    this.logger.log(`Created Telegram inbox: ${inbox.id} for tenant ${tenantId}`);

    return {
      inbox: InboxResponseDto.from(inbox),
      message: 'Telegram inbox created successfully.',
    };
  }

  // Creates an Instagram inbox with access token and page ID configuration
  async createInstagramInbox(
    tenantId: string,
    dto: CreateInstagramInboxDto,
  ): Promise<{ inbox: InboxResponseDto; message: string }> {
    const inbox = await this.inboxRepository.create({
      tenantId,
      name: dto.name,
      channelType: ChannelTypeValues.INSTAGRAM,
      status: InboxStatusValues.ACTIVE,
      channelConfig: {
        accessToken: dto.accessToken,
        pageId: dto.pageId,
      },
    });

    this.logger.log(`Created Instagram inbox: ${inbox.id} for tenant ${tenantId}`);

    return {
      inbox: InboxResponseDto.from(inbox),
      message: 'Instagram inbox created successfully.',
    };
  }

  // Creates a WhatsApp inbox after validating the access token and phone number ID
  async createWhatsAppInbox(
    tenantId: string,
    dto: CreateWhatsAppInboxDto,
  ): Promise<{ inbox: InboxResponseDto; message: string }> {
    const phoneInfo = await this.fetchWhatsAppPhoneInfo(dto.accessToken, dto.phoneNumberId);

    const inbox = await this.inboxRepository.create({
      tenantId,
      name: dto.name,
      channelType: ChannelTypeValues.WHATSAPP,
      status: InboxStatusValues.ACTIVE,
      channelConfig: {
        accessToken: dto.accessToken,
        phoneNumberId: dto.phoneNumberId,
        businessAccountId: dto.businessAccountId,
        verifyToken: dto.verifyToken,
        displayPhoneNumber: phoneInfo.displayPhoneNumber,
        verifiedName: phoneInfo.verifiedName,
      },
    });

    this.logger.log(`Created WhatsApp inbox: ${inbox.id} for tenant ${tenantId}`);

    return {
      inbox: InboxResponseDto.from(inbox),
      message: 'WhatsApp inbox created successfully.',
    };
  }

  // Retrieves a paginated list of inboxes for the given tenant
  async findAll(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ inboxes: InboxResponseDto[]; total: number; page: number; limit: number }> {
    const { data, total } = await this.inboxRepository.findAllByTenantId(tenantId, page, limit);

    return {
      inboxes: data.map(InboxResponseDto.from),
      total,
      page,
      limit,
    };
  }

  // Retrieves a single inbox by ID, scoped to the tenant
  async findById(id: string, tenantId: string): Promise<InboxResponseDto> {
    const inbox = await this.inboxRepository.findByIdAndTenantId(id, tenantId);

    if (!inbox) {
      throw new NotFoundException('Inbox not found.');
    }

    return InboxResponseDto.from(inbox);
  }

  // Deletes an inbox after verifying it belongs to the tenant.
  // For Telegram inboxes, the webhook is removed before deletion (best-effort).
  async delete(id: string, tenantId: string): Promise<void> {
    const inbox = await this.inboxRepository.findByIdAndTenantId(id, tenantId);

    if (!inbox) {
      throw new NotFoundException('Inbox not found.');
    }

    if (inbox.channelType === ChannelTypeValues.TELEGRAM) {
      const config = inbox.channelConfig as { botToken: string };
      await this.deleteTelegramWebhook(config.botToken);
    }

    await this.inboxRepository.delete(id);
    this.logger.log(`Deleted inbox: ${id} for tenant ${tenantId}`);
  }

  // Calls the Telegram Bot API to validate the token and retrieve bot metadata
  private async fetchTelegramBotInfo(
    botToken: string,
  ): Promise<{ firstName: string; username: string }> {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
    );
    const data = await response.json();

    if (!data.ok) {
      throw new BadRequestException({
        label: 'Invalid Bot Token',
        detail:
          'The bot token is invalid or the bot has been deleted. Please check the token and try again.',
        errors: [{ field: 'botToken', message: 'Invalid bot token' }],
      });
    }

    return {
      firstName: data.result.first_name,
      username: data.result.username,
    };
  }

  // Registers a Telegram webhook by first removing any existing webhook,
  // then setting the new one pointing to our ingress endpoint.
  private async setTelegramWebhook(botToken: string, inboxId: string): Promise<void> {
    const baseUrl = this.configService.getOrThrow<string>('WEBHOOK_BASE_URL');
    const webhookUrl = `${baseUrl}/webhooks/telegram/${inboxId}`;

    // Remove any existing webhook before setting a new one
    await this.deleteTelegramWebhook(botToken);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      },
    );
    const data = await response.json();

    if (!data.ok) {
      throw new BadRequestException({
        label: 'Webhook Registration Failed',
        detail:
          'Failed to register the Telegram webhook. Please verify the bot token is valid and try again.',
        errors: [{ field: 'botToken', message: 'Webhook registration failed' }],
      });
    }

    this.logger.log(`Telegram webhook set for inbox ${inboxId}`);
  }

  // Removes the Telegram webhook for the given bot token.
  // This is best-effort -- failures are logged but not thrown so that
  // inbox deletion is not blocked by a Telegram API issue.
  private async deleteTelegramWebhook(botToken: string): Promise<void> {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/deleteWebhook`,
      );
      const data = await response.json();

      if (!data.ok) {
        this.logger.warn(`Telegram deleteWebhook returned ok=false: ${data.description}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete Telegram webhook: ${error.message}`);
    }
  }

  // Calls the WhatsApp Cloud API to validate the access token and phone number ID
  private async fetchWhatsAppPhoneInfo(
    accessToken: string,
    phoneNumberId: string,
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
        throw new BadRequestException({
          label: 'Invalid WhatsApp Configuration',
          detail: `Could not validate the phone number: ${errorMsg}`,
          errors: [{ field: 'phoneNumberId', message: 'Invalid phone number ID' }],
        });
      }

      const data = await response.json();

      return {
        displayPhoneNumber: data.display_phone_number || '',
        verifiedName: data.verified_name || '',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      throw new BadRequestException({
        label: 'Connection Failed',
        detail: 'Could not connect to the WhatsApp Cloud API. Please verify your access token and try again.',
        errors: [{ field: 'accessToken', message: 'Invalid access token' }],
      });
    }
  }
}
