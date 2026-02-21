import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@vritti/api-sdk';
import { VerificationChannelValues } from '@/db/schema/enums';
import { SmsService, WhatsAppService } from '@/services';
import { TwilioSmsWebhookDto } from '../dto/request/sms-webhook.dto';
import { WebhookChallengeQueryDto } from '../dto/request/webhook-challenge-query.dto';
import { type WebhookProvider } from '../dto/request/webhook-provider-param.dto';
import { WebhookSignatureHeadersDto } from '../dto/request/webhook-signature-headers.dto';
import { WhatsAppWebhookDto } from '../dto/request/whatsapp-webhook.dto';
import { MobileVerificationService } from './mobile-verification.service';

@Injectable()
export class VerificationWebhookService {
  private readonly logger = new Logger(VerificationWebhookService.name);
  private readonly whatsappVerifyToken: string;
  private readonly smsVerifyToken: string;

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly smsService: SmsService,
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

  // Validates the subscription challenge token and returns the challenge string
  verifyChallenge(provider: WebhookProvider, query: WebhookChallengeQueryDto): string {
    if (provider === 'whatsapp') {
      if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === this.whatsappVerifyToken) {
        this.logger.log('WhatsApp webhook verification successful');
        return query['hub.challenge'] || '';
      }

      this.logger.warn(
        `WhatsApp webhook verification failed. Mode: ${query['hub.mode']}, Token match: ${query['hub.verify_token'] === this.whatsappVerifyToken}`,
      );
      throw new UnauthorizedException('Invalid WhatsApp verification token');
    }

    if (query.verify_token === this.smsVerifyToken) {
      this.logger.log('SMS webhook verification successful');
      return query.challenge || '';
    }

    this.logger.warn(`SMS webhook verification failed. Token match: ${query.verify_token === this.smsVerifyToken}`);
    throw new UnauthorizedException('Invalid SMS verification token');
  }

  // Validates the webhook signature and processes the payload asynchronously
  handleWebhook(
    provider: WebhookProvider,
    rawBody: string,
    headers: WebhookSignatureHeadersDto,
    payload: WhatsAppWebhookDto | TwilioSmsWebhookDto,
  ): { status: string } {
    if (!rawBody) {
      throw new UnauthorizedException('Unable to validate webhook signature');
    }

    if (provider === 'whatsapp') {
      return this.handleWhatsAppWebhook(rawBody, headers['x-hub-signature-256'] || '', payload as WhatsAppWebhookDto);
    }

    return this.handleSmsWebhook(rawBody, headers['x-twilio-signature'] || '', payload as TwilioSmsWebhookDto);
  }

  // Validates WhatsApp signature and fires async processing
  private handleWhatsAppWebhook(
    rawBody: string,
    signature: string,
    payload: WhatsAppWebhookDto,
  ): { status: string } {
    if (!this.whatsappService.validateWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid WhatsApp webhook signature');
    }

    this.logger.log('WhatsApp webhook signature validated successfully');

    this.processWhatsAppMessages(payload).catch((error) => {
      this.logger.error(`Error processing WhatsApp webhook: ${error.message}`, error.stack);
    });

    return { status: 'ok' };
  }

  // Validates SMS signature and fires async processing
  private handleSmsWebhook(
    rawBody: string,
    signature: string,
    payload: TwilioSmsWebhookDto,
  ): { status: string } {
    if (!this.smsService.validateWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid SMS webhook signature');
    }

    this.logger.log('SMS webhook signature validated successfully');

    this.processSmsMessage(payload).catch((error) => {
      this.logger.error(`Error processing SMS webhook: ${error.message}`, error.stack);
    });

    return { status: 'ok' };
  }

  // Iterates WhatsApp entries and verifies each text message containing a token
  private async processWhatsAppMessages(payload: WhatsAppWebhookDto): Promise<void> {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const messages = change.value.messages || [];
        const contacts = change.value.contacts || [];

        for (const message of messages) {
          if (message.type !== 'text' || !message.text?.body) continue;

          const phoneNumber = message.from;
          const messageText = message.text.body.trim();
          const senderName = contacts.find((c) => c.wa_id === phoneNumber)?.profile?.name || 'Unknown';

          this.logger.log(`Processing WhatsApp message from ${senderName} (${phoneNumber}): "${messageText}"`);

          const token = this.extractVerificationToken(messageText);
          if (!token) {
            this.logger.warn(`No verification token found in message: "${messageText}"`);
            continue;
          }

          this.logger.log(`Found verification token: ${token} from phone: ${phoneNumber}`);

          const success = await this.mobileVerificationService.verifyFromWebhook(
            token,
            phoneNumber,
            VerificationChannelValues.WHATSAPP_IN,
          );

          this.logger.log(
            success
              ? `Successfully verified phone ${phoneNumber} with token ${token}`
              : `Verification failed for token ${token} and phone ${phoneNumber}`,
          );
        }
      }
    }
  }

  // Extracts the verification token from an SMS message and verifies it
  private async processSmsMessage(payload: TwilioSmsWebhookDto): Promise<void> {
    const phoneNumber = payload.From;
    const messageText = payload.Body.trim();

    this.logger.log(`Processing SMS from ${phoneNumber}: "${messageText}"`);

    const token = this.extractVerificationToken(messageText);
    if (!token) {
      this.logger.warn(`No verification token found in SMS message: "${messageText}"`);
      return;
    }

    this.logger.log(`Found verification token: ${token} from phone: ${phoneNumber}`);

    const normalizedPhone = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

    const success = await this.mobileVerificationService.verifyFromWebhook(
      token,
      normalizedPhone,
      VerificationChannelValues.SMS_IN,
    );

    this.logger.log(
      success
        ? `Successfully verified phone ${phoneNumber} with token ${token}`
        : `Verification failed for token ${token} and phone ${phoneNumber}`,
    );
  }

  // Extracts a VER-prefixed token from message text
  private extractVerificationToken(messageText: string): string | null {
    const match = messageText.match(/VER-?([A-Z0-9]{6})/i);
    return match ? `VER${match[1].toUpperCase()}` : null;
  }

}
