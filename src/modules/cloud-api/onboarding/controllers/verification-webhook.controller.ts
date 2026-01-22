import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Headers,
  Logger,
  UnauthorizedException,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { Public } from '@vritti/api-sdk';
import { SkipCsrf } from '@/common/decorators/skip-csrf.decorator';
import { WhatsAppService } from '@/services';
import { SMSInboundProvider } from '../providers';
import { WhatsAppWebhookDto } from '../dto/whatsapp-webhook.dto';
import { TwilioSmsWebhookDto } from '../dto/sms-webhook.dto';
import { MobileVerificationService } from '../services/mobile-verification.service';

type WebhookProvider = 'whatsapp' | 'sms';

/**
 * Unified Verification Webhook Controller
 * Handles webhook verification and incoming message events from WhatsApp and SMS
 *
 * Webhook URLs:
 * - WhatsApp: https://your-domain.com/cloud-api/onboarding/webhooks/whatsapp
 * - SMS: https://your-domain.com/cloud-api/onboarding/webhooks/sms
 */
@Controller('onboarding/webhooks/:provider')
@SkipCsrf() // External webhooks cannot include CSRF tokens
export class VerificationWebhookController {
  private readonly logger = new Logger(VerificationWebhookController.name);
  private readonly whatsappVerifyToken: string;
  private readonly smsVerifyToken: string;

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly smsInboundProvider: SMSInboundProvider,
    private readonly mobileVerificationService: MobileVerificationService,
    private readonly configService: ConfigService,
  ) {
    this.whatsappVerifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') || '';
    this.smsVerifyToken = this.configService.get<string>('SMS_VERIFY_TOKEN') || '';

    if (!this.whatsappVerifyToken) {
      this.logger.warn('WHATSAPP_VERIFY_TOKEN is not configured. WhatsApp webhook verification will fail.');
    }
    if (!this.smsVerifyToken) {
      this.logger.warn('SMS_VERIFY_TOKEN is not configured. SMS webhook verification will fail.');
    }
  }

  /**
   * Webhook verification endpoint (GET)
   * Handles verification requests from both WhatsApp (Meta) and SMS (Twilio)
   *
   * WhatsApp Query Parameters:
   * - hub.mode: "subscribe"
   * - hub.challenge: Random string to echo back
   * - hub.verify_token: Verification token configured in Meta dashboard
   *
   * SMS Query Parameters:
   * - verify_token: Verification token configured in Twilio dashboard
   * - challenge: Random string to echo back
   *
   * @returns The challenge string if verification successful
   */
  @Get()
  @Public()
  async verifyWebhook(
    @Param('provider') provider: WebhookProvider,
    @Query('hub.mode') hubMode: string,
    @Query('hub.challenge') hubChallenge: string,
    @Query('hub.verify_token') hubVerifyToken: string,
    @Query('verify_token') smsVerifyToken: string,
    @Query('challenge') smsChallenge: string,
  ): Promise<string> {
    this.validateProvider(provider);
    this.logger.log(`Received ${provider} webhook verification request`);

    if (provider === 'whatsapp') {
      // WhatsApp/Meta verification
      if (hubMode === 'subscribe' && hubVerifyToken === this.whatsappVerifyToken) {
        this.logger.log('WhatsApp webhook verification successful');
        return hubChallenge;
      }

      this.logger.warn(`WhatsApp webhook verification failed. Mode: ${hubMode}, Token match: ${hubVerifyToken === this.whatsappVerifyToken}`);
      throw new UnauthorizedException('Invalid verification token');
    }

    if (provider === 'sms') {
      // Twilio/SMS verification
      if (smsVerifyToken === this.smsVerifyToken) {
        this.logger.log('SMS webhook verification successful');
        return smsChallenge;
      }

      this.logger.warn(`SMS webhook verification failed. Token match: ${smsVerifyToken === this.smsVerifyToken}`);
      throw new UnauthorizedException('Invalid verification token');
    }

    throw new BadRequestException(`Unsupported provider: ${provider}`);
  }

  /**
   * Webhook event handler (POST)
   * Receives incoming messages from WhatsApp or SMS
   *
   * Headers:
   * - WhatsApp: X-Hub-Signature-256 (HMAC-SHA256)
   * - SMS: X-Twilio-Signature (HMAC-SHA1)
   *
   * @returns Success response
   */
  @Post()
  @Public()
  async handleWebhook(
    @Param('provider') provider: WebhookProvider,
    @Req() request: FastifyRequest,
    @Headers('x-hub-signature-256') whatsappSignature: string,
    @Headers('x-twilio-signature') twilioSignature: string,
    @Body() payload: WhatsAppWebhookDto | TwilioSmsWebhookDto,
  ): Promise<{ status: string }> {
    this.validateProvider(provider);
    this.logger.log(`Received ${provider} webhook event`);

    // Get raw body for signature validation
    const rawBody = (request as any).rawBody as string;

    if (!rawBody) {
      this.logger.error('Raw body not available for signature validation');
      throw new UnauthorizedException('Unable to validate webhook signature');
    }

    if (provider === 'whatsapp') {
      return this.handleWhatsAppWebhook(rawBody, whatsappSignature, payload as WhatsAppWebhookDto);
    }

    if (provider === 'sms') {
      return this.handleSmsWebhook(rawBody, twilioSignature, payload as TwilioSmsWebhookDto);
    }

    throw new BadRequestException(`Unsupported provider: ${provider}`);
  }

  /**
   * Handle WhatsApp webhook
   */
  private async handleWhatsAppWebhook(
    rawBody: string,
    signature: string,
    payload: WhatsAppWebhookDto,
  ): Promise<{ status: string }> {
    // Validate signature
    const isValid = this.whatsappService.validateWebhookSignature(rawBody, signature);

    if (!isValid) {
      this.logger.error('Invalid WhatsApp webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log('WhatsApp webhook signature validated successfully');

    // Process asynchronously - respond immediately to Meta
    this.processWhatsAppWebhookAsync(payload).catch((error) => {
      this.logger.error(`Error processing WhatsApp webhook: ${error.message}`, error.stack);
    });

    return { status: 'ok' };
  }

  /**
   * Handle SMS webhook
   */
  private async handleSmsWebhook(
    rawBody: string,
    signature: string,
    payload: TwilioSmsWebhookDto,
  ): Promise<{ status: string }> {
    // Validate signature
    const isValid = this.smsInboundProvider.validateWebhook(rawBody, signature);

    if (!isValid) {
      this.logger.error('Invalid SMS webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log('SMS webhook signature validated successfully');

    // Process asynchronously - respond immediately to Twilio
    this.processSmsWebhookAsync(payload).catch((error) => {
      this.logger.error(`Error processing SMS webhook: ${error.message}`, error.stack);
    });

    return { status: 'ok' };
  }

  /**
   * Process WhatsApp webhook payload asynchronously
   */
  private async processWhatsAppWebhookAsync(payload: WhatsAppWebhookDto): Promise<void> {
    try {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field !== 'messages') {
            continue;
          }

          const value = change.value;
          const messages = value.messages || [];
          const contacts = value.contacts || [];

          for (const message of messages) {
            if (message.type !== 'text' || !message.text?.body) {
              this.logger.log(`Skipping non-text message type: ${message.type}`);
              continue;
            }

            const phoneNumber = message.from; // E.164 without + prefix
            const messageText = message.text.body.trim();
            const senderName = contacts.find((c) => c.wa_id === phoneNumber)?.profile?.name || 'Unknown';

            this.logger.log(`Processing WhatsApp message from ${senderName} (${phoneNumber}): "${messageText}"`);

            const verificationToken = this.extractVerificationToken(messageText);

            if (!verificationToken) {
              this.logger.warn(`No verification token found in message: "${messageText}"`);
              continue;
            }

            this.logger.log(`Found verification token: ${verificationToken} from phone: ${phoneNumber}`);

            const success = await this.mobileVerificationService.verifyFromWebhook(verificationToken, phoneNumber);

            if (success) {
              this.logger.log(`Successfully verified phone ${phoneNumber} with token ${verificationToken}`);
            } else {
              this.logger.warn(`Verification failed for token ${verificationToken} and phone ${phoneNumber}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in WhatsApp webhook processing: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process SMS webhook payload asynchronously
   */
  private async processSmsWebhookAsync(payload: TwilioSmsWebhookDto): Promise<void> {
    try {
      const phoneNumber = payload.From; // E.164 format with + prefix
      const messageText = payload.Body.trim();

      this.logger.log(`Processing SMS from ${phoneNumber}: "${messageText}"`);

      const verificationToken = this.extractVerificationToken(messageText);

      if (!verificationToken) {
        this.logger.warn(`No verification token found in SMS message: "${messageText}"`);
        return;
      }

      this.logger.log(`Found verification token: ${verificationToken} from phone: ${phoneNumber}`);

      // Normalize phone number (remove + prefix for consistency)
      const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

      const success = await this.mobileVerificationService.verifyFromWebhook(verificationToken, normalizedPhone);

      if (success) {
        this.logger.log(`Successfully verified phone ${phoneNumber} with token ${verificationToken}`);
      } else {
        this.logger.warn(`Verification failed for token ${verificationToken} and phone ${phoneNumber}`);
      }
    } catch (error) {
      this.logger.error(`Error in SMS webhook processing: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extract verification token from message text
   * Supports formats: "VERABC123", "VER-ABC123", "My code is VERABC123"
   */
  private extractVerificationToken(messageText: string): string | null {
    const regex = /VER-?([A-Z0-9]{6})/i;
    const match = messageText.match(regex);

    if (match) {
      return `VER${match[1].toUpperCase()}`;
    }

    return null;
  }

  /**
   * Validate that the provider is supported
   */
  private validateProvider(provider: string): asserts provider is WebhookProvider {
    if (provider !== 'whatsapp' && provider !== 'sms') {
      throw new BadRequestException(`Unsupported webhook provider: ${provider}. Supported: whatsapp, sms`);
    }
  }
}
