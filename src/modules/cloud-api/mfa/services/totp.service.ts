import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly issuer: string;

  constructor(private readonly configService: ConfigService) {
    this.issuer = this.configService.getOrThrow<string>('APP_NAME');
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
