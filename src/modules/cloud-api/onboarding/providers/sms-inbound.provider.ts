import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';
import { type SendVerificationResult, type VerificationProvider } from './verification-provider.interface';

/**
 * SMS Inbound Verification Provider
 * Handles verification via SMS inbound messages (user sends token via SMS reply)
 *
 * Flow:
 * 1. Send verification token to user's phone via SMS
 * 2. User sends the token back via SMS to our number
 * 3. Webhook receives the message and validates the token
 *
 * Development Mode:
 * - Logs token to terminal with Postman instructions
 * - Skips webhook signature validation
 * - Always returns configured: true
 *
 * Production Mode:
 * - Requires SMS gateway integration (e.g., Twilio)
 * - Validates webhook signatures
 */
@Injectable()
export class SMSInboundProvider implements VerificationProvider {
  private readonly logger = new Logger(SMSInboundProvider.name);
  readonly method: VerificationMethod = VerificationMethodValues.SMS_QR as VerificationMethod;
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

  /**
   * Send verification token via SMS
   *
   * In development mode: Logs token with Postman instructions
   * In production mode: Sends via configured SMS provider
   */
  async sendVerification(phone: string, _phoneCountry: string, token: string): Promise<SendVerificationResult> {
    try {
      // Development mode: Log token to terminal with Postman instructions
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

      // Production mode: Check configuration
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

  /**
   * Validate SMS webhook signature (Twilio signature validation)
   *
   * In development mode: Always returns true (skip validation)
   * In production mode: Validates HMAC-SHA1 signature
   */
  validateWebhook(payload: string, signature: string): boolean {
    // Development mode: Skip signature validation
    if (this.isDevelopment) {
      this.logger.debug('Dev mode: Skipping webhook signature validation');
      return true;
    }

    try {
      if (!signature || !this.smsWebhookSecret) {
        this.logger.warn('Missing signature or webhook secret for SMS validation');
        return false;
      }

      // Twilio signature validation
      // The signature is base64-encoded HMAC-SHA1 of the URL + POST params
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

  /**
   * Get instructions for SMS inbound verification
   */
  getInstructions(token: string, _phone?: string): string {
    if (this.smsPhoneNumber) {
      return `Reply to the SMS with the verification code "${token}" or send it to ${this.smsPhoneNumber} to verify your phone.`;
    }
    return `Reply to the SMS with the verification code "${token}" to verify your phone.`;
  }

  /**
   * Check if SMS Inbound is configured
   * In development mode: Always returns true
   * In production mode: Checks for SMS provider configuration
   */
  isConfigured(): boolean {
    // Always available in development mode
    if (this.isDevelopment) {
      return true;
    }
    // In production, check for actual SMS provider config
    return !!this.smsApiKey && !!this.smsApiSecret && !!this.smsPhoneNumber;
  }
}
