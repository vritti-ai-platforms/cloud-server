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
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ApiVerifyWebhook, ApiHandleWebhook } from '../docs/verification-webhook.docs';
import type { FastifyRequest } from 'fastify';
import { Public, SkipCsrf } from '@vritti/api-sdk';
import { WhatsAppService } from '@/services';
import { SMSInboundProvider } from '../providers';
import { WhatsAppWebhookDto } from '../dto/request/whatsapp-webhook.dto';
import { TwilioSmsWebhookDto } from '../dto/request/sms-webhook.dto';
import { MobileVerificationService } from '../services/mobile-verification.service';

type WebhookProvider = 'whatsapp' | 'sms';

@ApiTags('Onboarding - Webhooks')
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

  // Handles the webhook subscription verification challenge from WhatsApp or SMS providers
  @Get()
  @Public()
  @ApiVerifyWebhook()
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
      if (hubMode === 'subscribe' && hubVerifyToken === this.whatsappVerifyToken) {
        this.logger.log('WhatsApp webhook verification successful');
        return hubChallenge;
      }

      this.logger.warn(`WhatsApp webhook verification failed. Mode: ${hubMode}, Token match: ${hubVerifyToken === this.whatsappVerifyToken}`);
      throw new UnauthorizedException('Invalid WhatsApp verification token');
    }

    if (provider === 'sms') {
      if (smsVerifyToken === this.smsVerifyToken) {
        this.logger.log('SMS webhook verification successful');
        return smsChallenge;
      }

      this.logger.warn(`SMS webhook verification failed. Token match: ${smsVerifyToken === this.smsVerifyToken}`);
      throw new UnauthorizedException('Invalid SMS verification token');
    }

    throw new BadRequestException(`Unsupported provider: ${provider}`);
  }

  // Validates the webhook signature and dispatches the payload for async processing
  @Post()
  @Public()
  @ApiHandleWebhook()
  async handleWebhook(
    @Param('provider') provider: WebhookProvider,
    @Req() request: FastifyRequest,
    @Headers('x-hub-signature-256') whatsappSignature: string,
    @Headers('x-twilio-signature') twilioSignature: string,
    @Body() payload: WhatsAppWebhookDto | TwilioSmsWebhookDto,
  ): Promise<{ status: string }> {
    this.validateProvider(provider);
    this.logger.log(`Received ${provider} webhook event`);

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

  private async handleWhatsAppWebhook(
    rawBody: string,
    signature: string,
    payload: WhatsAppWebhookDto,
  ): Promise<{ status: string }> {
    const isValid = this.whatsappService.validateWebhookSignature(rawBody, signature);

    if (!isValid) {
      this.logger.error('Invalid WhatsApp webhook signature');
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }

    this.logger.log('WhatsApp webhook signature validated successfully');

    this.processWhatsAppWebhookAsync(payload).catch((error) => {
      this.logger.error(`Error processing WhatsApp webhook: ${error.message}`, error.stack);
    });

    return { status: 'ok' };
  }

  private async handleSmsWebhook(
    rawBody: string,
    signature: string,
    payload: TwilioSmsWebhookDto,
  ): Promise<{ status: string }> {
    const isValid = this.smsInboundProvider.validateWebhook(rawBody, signature);

    if (!isValid) {
      this.logger.error('Invalid SMS webhook signature');
      throw new UnauthorizedException('Invalid SMS webhook signature');
    }

    this.logger.log('SMS webhook signature validated successfully');

    this.processSmsWebhookAsync(payload).catch((error) => {
      this.logger.error(`Error processing SMS webhook: ${error.message}`, error.stack);
    });

    return { status: 'ok' };
  }

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

  private extractVerificationToken(messageText: string): string | null {
    const regex = /VER-?([A-Z0-9]{6})/i;
    const match = messageText.match(regex);

    if (match) {
      return `VER${match[1].toUpperCase()}`;
    }

    return null;
  }

  private validateProvider(provider: string): asserts provider is WebhookProvider {
    if (provider !== 'whatsapp' && provider !== 'sms') {
      throw new BadRequestException(`Unsupported webhook provider: ${provider}. Supported: whatsapp, sms`);
    }
  }
}
