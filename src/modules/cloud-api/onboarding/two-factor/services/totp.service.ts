import { Injectable, Logger } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { EncryptionService } from '../../../../../services';

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly ISSUER = 'Vritti';
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  constructor(private readonly encryptionService: EncryptionService) {
    authenticator.options = {
      digits: 6,
      step: 30,
      window: 1, // Allow ±1 step for clock drift
    };
  }

  // Generates a random 20-byte TOTP secret using the authenticator library
  generateTotpSecret(): string {
    return authenticator.generateSecret(20);
  }

  // Builds an otpauth:// URI for the authenticator app to scan
  generateKeyUri(accountName: string, secret: string): string {
    return authenticator.keyuri(accountName, this.ISSUER, secret);
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

  // Generates a set of random alphanumeric backup codes for account recovery
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      let code = '';
      for (let j = 0; j < this.BACKUP_CODE_LENGTH; j++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        code += chars[randomIndex];
      }
      codes.push(code);
    }
    return codes;
  }

  // Hashes each backup code for secure storage in the database
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes: string[] = [];
    for (const code of codes) {
      const hash = await this.encryptionService.hashOtp(code);
      hashedCodes.push(hash);
    }
    return hashedCodes;
  }

  // Validates a backup code against the hashed list and returns the remaining codes
  async verifyBackupCode(
    code: string,
    hashedCodes: string[],
  ): Promise<{ valid: boolean; remainingHashes: string[] }> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const isMatch = await this.encryptionService.compareOtp(code.toUpperCase(), hashedCodes[i]);
      if (isMatch) {
        const remainingHashes = [...hashedCodes.slice(0, i), ...hashedCodes.slice(i + 1)];
        return { valid: true, remainingHashes };
      }
    }
    return { valid: false, remainingHashes: hashedCodes };
  }

  // Splits the secret into space-separated groups of four characters for readability
  formatSecretForDisplay(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }
}
