import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';
import { SMSInboundProvider } from './sms-inbound.provider';
import { SMSOtpProvider } from './sms-otp.provider';
import { type VerificationProvider } from './verification-provider.interface';
import { WhatsAppProvider } from './whatsapp.provider';

/**
 * Verification Provider Factory
 * Factory pattern implementation for getting the appropriate verification provider
 * based on the verification method
 */
@Injectable()
export class VerificationProviderFactory {
  private readonly logger = new Logger(VerificationProviderFactory.name);

  constructor(
    private readonly whatsappProvider: WhatsAppProvider,
    private readonly smsInboundProvider: SMSInboundProvider,
    private readonly smsOtpProvider: SMSOtpProvider,
  ) {}

  /**
   * Get the appropriate verification provider based on method
   *
   * @param method The verification method
   * @returns The corresponding verification provider
   * @throws BadRequestException if method is not supported
   */
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

  /**
   * Get all available providers that are properly configured
   *
   * @returns Array of configured providers
   */
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

  /**
   * Check if a specific method is available
   *
   * @param method The verification method to check
   * @returns Whether the method is available
   */
  isMethodAvailable(method: VerificationMethod): boolean {
    try {
      const provider = this.getProvider(method);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  /**
   * Get the default provider (WhatsApp if available, otherwise first available)
   *
   * @returns The default verification provider
   * @throws BadRequestException if no providers are configured
   */
  getDefaultProvider(): VerificationProvider {
    // Prefer WhatsApp
    if (this.whatsappProvider.isConfigured()) {
      return this.whatsappProvider;
    }

    // Fallback to SMS OTP
    if (this.smsOtpProvider.isConfigured()) {
      return this.smsOtpProvider;
    }

    // Fallback to SMS Inbound
    if (this.smsInboundProvider.isConfigured()) {
      return this.smsInboundProvider;
    }

    throw new BadRequestException({
      label: 'No Providers Available',
      detail: 'Please configure at least one verification provider before proceeding.',
    });
  }
}
