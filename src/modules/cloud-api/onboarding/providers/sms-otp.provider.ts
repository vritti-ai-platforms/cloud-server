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
 * Development Mode:
 * - Logs OTP to terminal instead of sending SMS
 * - Always returns success
 *
 * Production Mode:
 * - Requires SMS provider configuration (MSG91, Twilio, etc.)
 */
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

  /**
   * Send OTP via SMS
   *
   * In development mode: Logs OTP to terminal
   * In production mode: Sends via configured SMS provider
   */
  async sendVerification(phone: string, _phoneCountry: string, otp: string): Promise<SendVerificationResult> {
    try {
      // Development mode: Log OTP to terminal
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

      // Production mode: Check configuration
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
  getInstructions(_token: string, phone?: string): string {
    const phoneDisplay = phone ? ` to ${phone}` : '';
    return `Enter the 6-digit verification code sent${phoneDisplay} via SMS.`;
  }

  /**
   * Check if SMS OTP is configured
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
