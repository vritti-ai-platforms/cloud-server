import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';
import { type SendVerificationResult, type VerificationProvider } from './verification-provider.interface';

@Injectable()
export class SMSOtpProvider implements VerificationProvider {
  private readonly logger = new Logger(SMSOtpProvider.name);
  readonly method: VerificationMethod = VerificationMethodValues.MANUAL_OTP as VerificationMethod;
  private readonly smsPhoneNumber: string;
  private readonly smsApiKey: string;
  private readonly smsApiSecret: string;
  private readonly isDevelopment: boolean;

  constructor(private readonly configService: ConfigService) {
    this.smsPhoneNumber = this.configService.get<string>('SMS_PHONE_NUMBER') || '';
    this.smsApiKey = this.configService.get<string>('SMS_API_KEY') || '';
    this.smsApiSecret = this.configService.get<string>('SMS_API_SECRET') || '';
    this.isDevelopment = this.configService.get<string>('NODE_ENV') !== 'production';
  }

  // Sends a one-time password via SMS to the user's phone number
  async sendVerification(phone: string, _phoneCountry: string, otp: string): Promise<SendVerificationResult> {
    try {
      if (this.isDevelopment) {
        this.logger.log(`
╔════════════════════════════════════════════════════════════╗
║             SMS OTP (Development Mode)                     ║
╠════════════════════════════════════════════════════════════╣
║  Phone: ${phone.padEnd(44)}║
║  OTP:   ${otp.padEnd(44)}║
╠════════════════════════════════════════════════════════════╣
║  Copy the 6-digit OTP above and enter it in the app        ║
╚════════════════════════════════════════════════════════════╝
        `);
        return {
          success: true,
          messageId: `dev_otp_${Date.now()}`,
        };
      }

      if (!this.isConfigured()) {
        this.logger.warn('SMS OTP provider is not configured');
        return {
          success: false,
          error: 'SMS service is not configured',
        };
      }

      // TODO: Implement actual SMS sending via MSG91, Twilio, or other provider
      // Example:
      // const result = await this.msg91Client.sendOtp(phone.replace('+', ''));
      // return { success: result.type === 'success', messageId: result.request_id };

      this.logger.warn('SMS provider not implemented for production');
      return {
        success: false,
        error: 'SMS provider not implemented',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send SMS OTP: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Returns false because the OTP provider does not use inbound webhooks
  validateWebhook(_payload: string, _signature: string): boolean {
    // SMS OTP doesn't use webhooks
    return false;
  }

  // Returns user-facing instructions for entering the OTP received via SMS
  getInstructions(_token: string, phone?: string): string {
    const phoneDisplay = phone ? ` to ${phone}` : '';
    return `Enter the 6-digit verification code sent${phoneDisplay} via SMS.`;
  }

  // Checks whether the SMS OTP provider has the required credentials configured
  isConfigured(): boolean {
    if (this.isDevelopment) {
      return true;
    }
    return !!this.smsApiKey && !!this.smsApiSecret && !!this.smsPhoneNumber;
  }
}
