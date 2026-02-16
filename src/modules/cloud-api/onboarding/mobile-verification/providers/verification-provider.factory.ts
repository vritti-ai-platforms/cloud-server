import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { type VerificationChannel, VerificationChannelValues } from '@/db/schema/enums';
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

  // Returns the provider instance corresponding to the given verification channel
  getProvider(channel: VerificationChannel): VerificationProvider {
    switch (channel) {
      case VerificationChannelValues.WHATSAPP_IN:
        return this.whatsappProvider;

      case VerificationChannelValues.SMS_IN:
        return this.smsInboundProvider;

      case VerificationChannelValues.SMS_OUT:
        return this.smsOtpProvider;

      default:
        this.logger.error(`Unsupported verification channel: ${channel}`);
        throw new BadRequestException({
          label: 'Unsupported Verification Channel',
          detail: `The channel '${channel}' is not available. Please use a different verification channel.`,
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

  // Checks whether the given verification channel has a configured provider
  isChannelAvailable(channel: VerificationChannel): boolean {
    try {
      const provider = this.getProvider(channel);
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
