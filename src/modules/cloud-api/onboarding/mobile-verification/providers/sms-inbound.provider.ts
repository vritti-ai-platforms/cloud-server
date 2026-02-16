import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { type VerificationChannel, VerificationChannelValues } from '@/db/schema/enums';
import { type SendVerificationResult, type VerificationProvider } from './verification-provider.interface';

@Injectable()
export class SMSInboundProvider implements VerificationProvider {
  private readonly logger = new Logger(SMSInboundProvider.name);
  readonly channel: VerificationChannel = VerificationChannelValues.SMS_IN;
  private readonly smsPhoneNumber: string;
  private readonly smsApiKey: string;
  private readonly smsApiSecret: string;
  private readonly smsWebhookSecret: string;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.smsPhoneNumber = this.configService.get<string>('SMS_PHONE_NUMBER') || '';
    this.smsApiKey = this.configService.get<string>('SMS_API_KEY') || '';
    this.smsApiSecret = this.configService.get<string>('SMS_API_SECRET') || '';
    this.smsWebhookSecret = this.configService.get<string>('SMS_WEBHOOK_SECRET') || '';
    this.isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';
  }

  // Sends an SMS containing the verification token (dev mode logs to console)
  async sendVerification(phone: string, _phoneCountry: string, token: string): Promise<SendVerificationResult> {
    try {
      if (this.isDevelopment) {
        this.logger.log(`
╔════════════════════════════════════════════════════════════╗
║           SMS INBOUND (Development Mode)                   ║
╠════════════════════════════════════════════════════════════╣
║  Token: ${token.padEnd(44)}║
╠════════════════════════════════════════════════════════════╣
║  Use this token in Postman:                                ║
║  POST /cloud-api/onboarding/webhooks/sms                   ║
║  Body: {                                                   ║
║    "From": "+919876543210",                                ║
║    "To": "+1234567890",                                    ║
║    "Body": "${token}",${' '.repeat(Math.max(0, 36 - token.length))}║
║    "MessageSid": "SM123",                                  ║
║    "AccountSid": "AC123"                                   ║
║  }                                                         ║
╚════════════════════════════════════════════════════════════╝
        `);
        return {
          success: true,
          messageId: `dev_sms_${Date.now()}`,
        };
      }

      if (!this.isConfigured()) {
        this.logger.warn('SMS Inbound provider is not configured');
        return {
          success: false,
          error: 'SMS service is not configured',
        };
      }

      // TODO: Implement actual SMS sending via Twilio or other provider
      // Example Twilio integration:
      // const client = require('twilio')(this.smsApiKey, this.smsApiSecret);
      // const message = await client.messages.create({
      //   body: `Your Vritti verification code is: ${token}\n\nReply with this code to verify.`,
      //   from: this.smsPhoneNumber,
      //   to: phone,
      // });

      this.logger.warn('SMS provider not implemented for production');
      return {
        success: false,
        error: 'SMS provider not implemented',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send SMS verification: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Validates the inbound SMS webhook signature using HMAC-SHA1
  validateWebhook(payload: string, signature: string): boolean {
    if (this.isDevelopment) {
      this.logger.debug('Dev mode: Skipping webhook signature validation');
      return true;
    }

    try {
      if (!signature || !this.smsWebhookSecret) {
        this.logger.warn('Missing signature or webhook secret for SMS validation');
        return false;
      }

      const hmac = crypto.createHmac('sha1', this.smsWebhookSecret);
      hmac.update(payload);
      const expectedSignature = hmac.digest('base64');

      const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

      if (!isValid) {
        this.logger.warn('SMS webhook signature validation failed');
      }

      return isValid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error validating SMS webhook signature: ${errorMessage}`);
      return false;
    }
  }

  // Returns user-facing instructions for replying with the verification token via SMS
  getInstructions(token: string, _phone?: string): string {
    if (this.smsPhoneNumber) {
      return `Reply to the SMS with the verification code "${token}" or send it to ${this.smsPhoneNumber} to verify your phone.`;
    }
    return `Reply to the SMS with the verification code "${token}" to verify your phone.`;
  }

  // Checks whether the SMS inbound provider has the required credentials configured
  isConfigured(): boolean {
    if (this.isDevelopment) {
      return true;
    }
    return !!this.smsApiKey && !!this.smsApiSecret && !!this.smsPhoneNumber;
  }
}
