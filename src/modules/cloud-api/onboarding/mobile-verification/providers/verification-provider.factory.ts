import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';
import { SMSInboundProvider } from './sms-inbound.provider';
import { SMSOtpProvider } from './sms-otp.provider';
import { type VerificationProvider } from './verification-provider.interface';
import { WhatsAppProvider } from './whatsapp.provider';

@Injectable()
export class VerificationProviderFactory {
  private readonly logger = new Logger(VerificationProviderFactory.name);

  constructor(
    private readonly whatsappProvider: WhatsAppProvider,
    private readonly smsInboundProvider: SMSInboundProvider,
    private readonly smsOtpProvider: SMSOtpProvider,
  ) {}

  // Returns the provider instance corresponding to the given verification method
  getProvider(method: VerificationMethod): VerificationProvider {
    switch (method) {
      case VerificationMethodValues.WHATSAPP_QR:
        return this.whatsappProvider;

      case VerificationMethodValues.SMS_QR:
        return this.smsInboundProvider;

      case VerificationMethodValues.MANUAL_OTP:
        return this.smsOtpProvider;

      default:
        this.logger.error(`Unsupported verification method: ${method}`);
        throw new BadRequestException({
          label: 'Unsupported Verification Method',
          detail: `The method '${method}' is not available. Please use a different verification method.`,
        });
    }
  }

  // Returns a list of all properly configured verification providers
  getAvailableProviders(): VerificationProvider[] {
    const providers: VerificationProvider[] = [];

    if (this.whatsappProvider.isConfigured()) {
      providers.push(this.whatsappProvider);
    }
    if (this.smsInboundProvider.isConfigured()) {
      providers.push(this.smsInboundProvider);
    }
    if (this.smsOtpProvider.isConfigured()) {
      providers.push(this.smsOtpProvider);
    }

    return providers;
  }

  // Checks whether the given verification method has a configured provider
  isMethodAvailable(method: VerificationMethod): boolean {
    try {
      const provider = this.getProvider(method);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  // Returns the first available provider in priority order (WhatsApp > OTP > SMS)
  getDefaultProvider(): VerificationProvider {
    if (this.whatsappProvider.isConfigured()) {
      return this.whatsappProvider;
    }

    if (this.smsOtpProvider.isConfigured()) {
      return this.smsOtpProvider;
    }

    if (this.smsInboundProvider.isConfigured()) {
      return this.smsInboundProvider;
    }

    throw new BadRequestException({
      label: 'No Providers Available',
      detail: 'Please configure at least one verification provider before proceeding.',
    });
  }
}
