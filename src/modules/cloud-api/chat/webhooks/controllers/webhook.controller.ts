import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public, SkipCsrf } from '@vritti/api-sdk';
import {
  ApiTelegramWebhook,
  ApiWhatsAppWebhook,
  ApiWhatsAppVerify,
  ApiInstagramWebhook,
  ApiInstagramVerify,
  ApiInstagramGenericWebhook,
  ApiInstagramGenericVerify,
} from '../docs/webhook.docs';
import { ConfigService } from '@nestjs/config';
import { InboxRepository } from '../../inboxes/repositories/inbox.repository';
import { WebhookHandlerService } from '../services/webhook-handler.service';
import { TelegramAdapter } from '../services/telegram.adapter';
import { WhatsAppAdapter } from '../services/whatsapp.adapter';
import { InstagramAdapter } from '../services/instagram.adapter';

@Controller('webhooks')
@SkipCsrf() // External webhooks cannot include CSRF tokens
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookHandler: WebhookHandlerService,
    private readonly telegramAdapter: TelegramAdapter,
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly instagramAdapter: InstagramAdapter,
    private readonly inboxRepository: InboxRepository,
    private readonly configService: ConfigService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // Telegram
  // ──────────────────────────────────────────────────────────────────────────

  @Post('telegram/:inboxId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiTelegramWebhook()
  async telegramWebhook(
    @Param('inboxId') inboxId: string,
    @Body() payload: any,
  ): Promise<{ ok: true }> {
    const parsed = this.telegramAdapter.parseIncomingMessage(payload);
    if (!parsed) return { ok: true };

    // Process async -- return 200 OK immediately to Telegram
    this.webhookHandler.handleIncomingMessage(inboxId, parsed).catch((err) => {
      this.logger.error(`Error processing Telegram webhook for inbox ${inboxId}`, err.stack);
    });

    return { ok: true };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // WhatsApp
  // ──────────────────────────────────────────────────────────────────────────

  @Post('whatsapp/:inboxId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiWhatsAppWebhook()
  async whatsappWebhook(
    @Param('inboxId') inboxId: string,
    @Body() payload: any,
  ): Promise<{ ok: true }> {
    const parsed = this.whatsappAdapter.parseIncomingMessage(payload);
    if (!parsed) return { ok: true };

    // Process async -- return 200 OK immediately to Meta
    this.webhookHandler.handleIncomingMessage(inboxId, parsed).catch((err) => {
      this.logger.error(`Error processing WhatsApp webhook for inbox ${inboxId}`, err.stack);
    });

    return { ok: true };
  }

  /** WhatsApp verification challenge from Meta */
  @Get('whatsapp/:inboxId')
  @Public()
  @ApiWhatsAppVerify()
  async whatsappVerify(
    @Param('inboxId') inboxId: string,
    @Query() query: Record<string, string>,
  ): Promise<string> {
    const inbox = await this.inboxRepository.findById(inboxId);
    if (!inbox) return '';

    const config = inbox.channelConfig as { verifyToken?: string };
    return this.whatsappAdapter.verifyWebhook(query, config.verifyToken || '') || '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Instagram
  // ──────────────────────────────────────────────────────────────────────────

  @Post('instagram/:inboxId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiInstagramWebhook()
  async instagramWebhook(
    @Param('inboxId') inboxId: string,
    @Body() payload: any,
  ): Promise<{ ok: true }> {
    const parsed = this.instagramAdapter.parseIncomingMessage(payload);
    if (!parsed) return { ok: true };

    // Process async -- return 200 OK immediately to Meta
    this.webhookHandler.handleIncomingMessage(inboxId, parsed).catch((err) => {
      this.logger.error(`Error processing Instagram webhook for inbox ${inboxId}`, err.stack);
    });

    return { ok: true };
  }

  /** Instagram verification challenge from Meta */
  @Get('instagram/:inboxId')
  @Public()
  @ApiInstagramVerify()
  async instagramVerify(
    @Param('inboxId') inboxId: string,
    @Query() query: Record<string, string>,
  ): Promise<string> {
    const inbox = await this.inboxRepository.findById(inboxId);
    if (!inbox) return '';

    const config = inbox.channelConfig as { verifyToken?: string };
    return this.instagramAdapter.verifyWebhook(query, config.verifyToken || '') || '';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Instagram (Generic — app-level webhook, no inboxId in URL)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Generic Instagram webhook endpoint for app-level subscription.
   * Meta sends ALL Instagram events to this single URL. The inbox is
   * resolved from the recipient Instagram ID in the payload.
   */
  @Post('instagram')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiInstagramGenericWebhook()
  async instagramGenericWebhook(@Body() payload: any): Promise<{ ok: true }> {
    this.logger.log('POST /webhooks/instagram (generic) — received webhook event');
    this.logger.debug(`Instagram webhook payload: ${JSON.stringify(payload)}`);

    const parsed = this.instagramAdapter.parseIncomingMessage(payload);
    if (!parsed) {
      this.logger.debug('Instagram webhook payload did not contain a processable message');
      return { ok: true };
    }

    // Extract recipient Instagram ID from payload to find the inbox
    const recipientId = this.instagramAdapter.extractRecipientId(payload);
    if (!recipientId) {
      this.logger.warn('Instagram webhook payload missing recipient ID in entry[].id');
      return { ok: true };
    }

    // Look up inbox by Instagram user ID
    const inbox = await this.inboxRepository.findByInstagramUserId(recipientId);
    if (!inbox) {
      this.logger.warn(`No inbox found for Instagram recipient ID: ${recipientId}`);
      return { ok: true };
    }

    this.logger.log(`Routing Instagram webhook to inbox ${inbox.id} (recipient: ${recipientId})`);

    // Process async — return 200 OK immediately to Meta
    this.webhookHandler.handleIncomingMessage(inbox.id, parsed).catch((err) => {
      this.logger.error(`Error processing Instagram generic webhook for inbox ${inbox.id}`, err.stack);
    });

    return { ok: true };
  }

  /** Generic Instagram verification challenge from Meta */
  @Get('instagram')
  @Public()
  @ApiInstagramGenericVerify()
  async instagramGenericVerify(@Query() query: Record<string, string>): Promise<string> {
    const verifyToken = this.configService.get<string>('INSTAGRAM_WEBHOOK_VERIFY_TOKEN', '');
    return this.instagramAdapter.verifyWebhook(query, verifyToken) || '';
  }
}
