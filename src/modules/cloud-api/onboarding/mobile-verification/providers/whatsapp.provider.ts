import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from '@/services';
import { type VerificationChannel, VerificationChannelValues } from '@/db/schema/enums';
import { type SendVerificationResult, type VerificationProvider } from './verification-provider.interface';

@Injectable()
export class WhatsAppProvider implements VerificationProvider {
  private readonly logger = new Logger(WhatsAppProvider.name);
  readonly channel: VerificationChannel = VerificationChannelValues.WHATSAPP_IN;
  private readonly whatsappBusinessNumber: string;

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
  ) {
    this.whatsappBusinessNumber = this.configService.get<string>('WHATSAPP_BUSINESS_NUMBER') || '';
  }

  // Sends a verification message containing the token via WhatsApp Business API
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

  // Delegates webhook signature validation to the WhatsApp service
  validateWebhook(payload: string, signature: string): boolean {
    return this.whatsappService.validateWebhookSignature(payload, signature);
  }

  // Returns user-facing instructions for sending the verification code via WhatsApp
  getInstructions(token: string, _phone?: string): string {
    if (this.whatsappBusinessNumber) {
      return `Send the verification code "${token}" to our WhatsApp Business number (${this.whatsappBusinessNumber}) to verify your phone.`;
    }
    return `Send the verification code "${token}" to our WhatsApp Business number to verify your phone.`;
  }

  // Checks whether all required WhatsApp API credentials are configured
  isConfigured(): boolean {
    return (
      !!this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') &&
      !!this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') &&
      !!this.configService.get<string>('WHATSAPP_APP_SECRET')
    );
  }
}
