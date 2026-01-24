import { Injectable, Logger } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { EncryptionService } from '../../../../services';

@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly ISSUER = 'Vritti';
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  constructor(private readonly encryptionService: EncryptionService) {
    // Configure otplib authenticator
    authenticator.options = {
      digits: 6,
      step: 30,
      window: 1, // Allow ±1 step for clock drift
    };
  }

  /**
   * Generate a new TOTP secret (20 bytes, base32 encoded)
   */
  generateTotpSecret(): string {
    return authenticator.generateSecret(20);
  }

  /**
   * Generate otpauth:// URI for authenticator apps
   */
  generateKeyUri(accountName: string, secret: string): string {
    return authenticator.keyuri(accountName, this.ISSUER, secret);
  }

  /**
   * Generate QR code as base64 data URL
   */
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

  /**
   * Verify a TOTP token against a secret
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      this.logger.error(`TOTP verification error: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Generate backup codes (10 codes, 8 chars each)
   * Excludes confusing characters (0, O, 1, I) for readability
   */
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

  /**
   * Hash backup codes for storage (bcrypt)
   */
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const hashedCodes: string[] = [];
    for (const code of codes) {
      const hash = await this.encryptionService.hashOtp(code);
      hashedCodes.push(hash);
    }
    return hashedCodes;
  }

  /**
   * Verify a backup code against hashed codes
   * Returns { valid, remainingHashes } - remainingHashes excludes the used code
   */
  async verifyBackupCode(
    code: string,
    hashedCodes: string[],
  ): Promise<{ valid: boolean; remainingHashes: string[] }> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const isMatch = await this.encryptionService.compareOtp(code.toUpperCase(), hashedCodes[i]);
      if (isMatch) {
        // Remove the used code
        const remainingHashes = [...hashedCodes.slice(0, i), ...hashedCodes.slice(i + 1)];
        return { valid: true, remainingHashes };
      }
    }
    return { valid: false, remainingHashes: hashedCodes };
  }

  /**
   * Format secret for display (groups of 4 chars)
   */
  formatSecretForDisplay(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }
}
