import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from '@/services';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';
import { type SendVerificationResult, type VerificationProvider } from './verification-provider.interface';

/**
 * WhatsApp Verification Provider
 * Handles verification via WhatsApp inbound messages
 *
 * Flow:
 * 1. Send verification token to user's WhatsApp
 * 2. User sends the token back to our WhatsApp Business number
 * 3. Webhook receives the message and validates the token
 */
@Injectable()
export class WhatsAppProvider implements VerificationProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  readonly method: VerificationMethod = VerificationMethodValues.WHATSAPP_QR as VerificationMethod;
  private readonly whatsappBusinessNumber: string;

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
  ) {
    this.whatsappBusinessNumber = this.configService.get<string>('WHATSAPP_BUSINESS_NUMBER') || '';
  }

  /**
   * Send verification token via WhatsApp
   */
  async sendVerification(phone: string, _phoneCountry: string, token: string): Promise<SendVerificationResult> {
    try {
      this.logger.log(`Sending WhatsApp verification to ${phone} with token ${token}`);

      const messageId = await this.whatsappService.sendVerificationMessage(phone, token);

      this.logger.log(`WhatsApp verification sent successfully. Message ID: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp verification: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate WhatsApp webhook signature
   */
  validateWebhook(payload: string, signature: string): boolean {
    return this.whatsappService.validateWebhookSignature(payload, signature);
  }

  /**
   * Get instructions for WhatsApp verification
   */
  getInstructions(token: string, _phone?: string): string {
    if (this.whatsappBusinessNumber) {
      return `Send the verification code "${token}" to our WhatsApp Business number (${this.whatsappBusinessNumber}) to verify your phone.`;
    }
    return `Send the verification code "${token}" to our WhatsApp Business number to verify your phone.`;
  }

  /**
   * Check if WhatsApp is configured
   */
  isConfigured(): boolean {
    return (
      !!this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') &&
      !!this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') &&
      !!this.configService.get<string>('WHATSAPP_APP_SECRET')
    );
  }
}
