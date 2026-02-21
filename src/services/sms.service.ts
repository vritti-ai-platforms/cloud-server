import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly webhookSecret: string;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>('SMS_WEBHOOK_SECRET') || '';
    this.isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';

    this.logger.warn('SMS service is currently in mock mode');
  }

  // Sends a verification OTP via SMS (mock in development)
  async sendVerificationSms(phoneNumber: string, otp: string, firstName?: string): Promise<void> {
    try {
      const message = `Hello${firstName ? ` ${firstName}` : ''}, your Vritti AI Cloud verification code is: ${otp}. This code will expire in 10 minutes.`;

      // TODO: Integrate with Twilio or other SMS provider
      console.log(message);
      this.logger.warn(`[MOCK] SMS verification would be sent to ${phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}:`, error);
      throw new Error('Failed to send SMS');
    }
  }

  // Validates the inbound SMS webhook signature using HMAC-SHA1
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (this.isDevelopment) {
      this.logger.debug('Dev mode: Skipping SMS webhook signature validation');
      return true;
    }

    try {
      if (!signature || !this.webhookSecret) {
        this.logger.warn('Missing signature or webhook secret for SMS validation');
        return false;
      }

      const hmac = crypto.createHmac('sha1', this.webhookSecret);
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

  // Validates phone number is in E.164 format
  validatePhoneNumber(phoneNumber: string): boolean {
    return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
  }
}
