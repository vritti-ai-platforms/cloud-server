import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';
import { type SendVerificationResult, type VerificationProvider } from './verification-provider.interface';

/**
 * SMS OTP Verification Provider
 * Handles verification via SMS OTP (user receives OTP and enters it in the app)
 *
 * Flow:
 * 1. Generate 6-digit OTP and send to user's phone via SMS
 * 2. User enters the OTP in the app
 * 3. API validates the OTP directly (not webhook-based)
 *
 * Note: This requires integration with an SMS gateway (e.g., Twilio)
 */
@Injectable()
export class SMSOtpProvider implements VerificationProvider {
  private readonly logger = new Logger(SMSOtpProvider.name);
  readonly method: VerificationMethod = VerificationMethodValues.MANUAL_OTP as VerificationMethod;
  private readonly smsPhoneNumber: string;
  private readonly smsApiKey: string;
  private readonly smsApiSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.smsPhoneNumber = this.configService.get<string>('SMS_PHONE_NUMBER') || '';
    this.smsApiKey = this.configService.get<string>('SMS_API_KEY') || '';
    this.smsApiSecret = this.configService.get<string>('SMS_API_SECRET') || '';
  }

  /**
   * Send OTP via SMS
   *
   * TODO: Integrate with actual SMS gateway (e.g., Twilio)
   * For now, this is a placeholder implementation
   */
  async sendVerification(phone: string, _phoneCountry: string, otp: string): Promise<SendVerificationResult> {
    try {
      this.logger.log(`Sending SMS OTP to ${phone}`);

      if (!this.isConfigured()) {
        this.logger.warn('SMS OTP provider is not configured');
        return {
          success: false,
          error: 'SMS service is not configured',
        };
      }

      // TODO: Implement actual SMS sending via Twilio or other provider
      // Example Twilio integration:
      // const client = require('twilio')(this.smsApiKey, this.smsApiSecret);
      // const message = await client.messages.create({
      //   body: `Your Vritti verification code is: ${otp}\n\nEnter this code in the app to verify your phone number.\n\nThis code expires in 5 minutes.`,
      //   from: this.smsPhoneNumber,
      //   to: phone,
      // });

      // Placeholder: Log that we would send SMS
      this.logger.log(`[PLACEHOLDER] Would send SMS OTP to ${phone}: Your verification code is ${otp}`);

      return {
        success: true,
        messageId: `sms_otp_${Date.now()}`, // Placeholder message ID
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS OTP: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * SMS OTP does not use webhooks - validation is done via API
   * This method is not used for this provider
   */
  validateWebhook(_payload: string, _signature: string): boolean {
    // SMS OTP doesn't use webhooks
    return false;
  }

  /**
   * Get instructions for SMS OTP verification
   */
  getInstructions(_token: string, _phone?: string): string {
    return 'Enter the 6-digit verification code sent to your phone via SMS.';
  }

  /**
   * Check if SMS OTP is configured
   */
  isConfigured(): boolean {
    return !!this.smsApiKey && !!this.smsApiSecret && !!this.smsPhoneNumber;
  }
}
