import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly issuer: string;

  constructor(private readonly configService: ConfigService) {
    this.issuer = this.configService.get<string>('TOTP_ISSUER', 'Vritti');
    authenticator.options = {
      digits: 6,
      step: 30,
      window: 1, // Allow +-1 step for clock drift
    };
  }

  // Generates a random 20-byte TOTP secret using the authenticator library
  generateTotpSecret(): string {
    return authenticator.generateSecret(20);
  }

  // Builds an otpauth:// URI for the authenticator app to scan
  generateKeyUri(accountName: string, secret: string): string {
    return authenticator.keyuri(accountName, this.issuer, secret);
  }

  // Encodes the key URI into a QR code data URL for display in the frontend
  async generateQrCodeDataUrl(keyUri: string): Promise<string> {
    try {
      return await QRCode.toDataURL(keyUri, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (error) {
      this.logger.error(`Failed to generate QR code: ${(error as Error).message}`);
      throw new Error('QR code generation failed');
    }
  }

  // Verifies a 6-digit TOTP token against the secret with a one-step clock drift window
  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      this.logger.error(`TOTP verification error: ${(error as Error).message}`);
      return false;
    }
  }

  // Splits the secret into space-separated groups of four characters for readability
  formatSecretForDisplay(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }

  // Returns the configured TOTP issuer name
  getIssuer(): string {
    return this.issuer;
  }
}
