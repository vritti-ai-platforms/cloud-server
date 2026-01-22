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
 * Note: This requires integration with an SMS gateway (e.g., Twilio)
 */
@Injectable()
export class SMSInboundProvider implements VerificationProvider {
  private readonly logger = new Logger(SMSInboundProvider.name);
  readonly method: VerificationMethod = VerificationMethodValues.SMS_QR as VerificationMethod;
  private readonly smsPhoneNumber: string;
  private readonly smsApiKey: string;
  private readonly smsApiSecret: string;
  private readonly smsWebhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.smsPhoneNumber = this.configService.get<string>('SMS_PHONE_NUMBER') || '';
    this.smsApiKey = this.configService.get<string>('SMS_API_KEY') || '';
    this.smsApiSecret = this.configService.get<string>('SMS_API_SECRET') || '';
    this.smsWebhookSecret = this.configService.get<string>('SMS_WEBHOOK_SECRET') || '';
  }

  /**
   * Send verification token via SMS
   *
   * TODO: Integrate with actual SMS gateway (e.g., Twilio)
   * For now, this is a placeholder implementation
   */
  async sendVerification(phone: string, _phoneCountry: string, token: string): Promise<SendVerificationResult> {
    try {
      this.logger.log(`Sending SMS verification to ${phone} with token ${token}`);

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
      //   body: `Your Vritti verification code is: ${token}\n\nReply with this code to verify your phone number.\n\nThis code expires in 10 minutes.`,
      //   from: this.smsPhoneNumber,
      //   to: phone,
      // });

      // Placeholder: Log that we would send SMS
      this.logger.log(`[PLACEHOLDER] Would send SMS to ${phone}: Your verification code is ${token}`);

      return {
        success: true,
        messageId: `sms_${Date.now()}`, // Placeholder message ID
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS verification: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate SMS webhook signature (Twilio signature validation)
   *
   * Twilio uses a specific signature format:
   * - Signature is in X-Twilio-Signature header
   * - Uses HMAC-SHA1 of URL + sorted POST params
   */
  validateWebhook(payload: string, signature: string): boolean {
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
      this.logger.error(`Error validating SMS webhook signature: ${error.message}`, error.stack);
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
   */
  isConfigured(): boolean {
    return !!this.smsApiKey && !!this.smsApiSecret && !!this.smsPhoneNumber;
  }
}
