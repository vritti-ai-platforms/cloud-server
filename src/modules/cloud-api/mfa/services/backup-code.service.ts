import { Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '../../../../services';

@Injectable()
export class BackupCodeService {
  private readonly logger = new Logger(BackupCodeService.name);
  private readonly BACKUP_CODE_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  constructor(private readonly encryptionService: EncryptionService) {}

  // Generates a set of cryptographically random alphanumeric backup codes for account recovery
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    for (let i = 0; i < this.BACKUP_CODE_COUNT; i++) {
      let code = '';
      const randomBytes = new Uint8Array(this.BACKUP_CODE_LENGTH);
      crypto.getRandomValues(randomBytes);
      for (let j = 0; j < this.BACKUP_CODE_LENGTH; j++) {
        code += chars[randomBytes[j] % chars.length];
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
}
