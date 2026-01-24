import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import {
  type TwoFactorAuth,
  type TwoFactorMethod,
  TwoFactorMethodValues,
  twoFactorAuth,
} from '@/db/schema';

@Injectable()
export class TwoFactorAuthRepository extends PrimaryBaseRepository<typeof twoFactorAuth> {
  constructor(database: PrimaryDatabaseService) {
    super(database, twoFactorAuth);
  }

  /**
   * Find active 2FA record for a user
   */
  async findActiveByUserId(userId: string): Promise<TwoFactorAuth | undefined> {
    this.logger.debug(`Finding active 2FA for user: ${userId}`);
    return this.model.findFirst({
      where: { userId, isActive: true },
    });
  }

  /**
   * Find 2FA by user ID and method
   */
  async findByUserIdAndMethod(userId: string, method: TwoFactorMethod): Promise<TwoFactorAuth | undefined> {
    this.logger.debug(`Finding 2FA for user ${userId} with method ${method}`);
    return this.model.findFirst({
      where: { userId, method },
    });
  }

  /**
   * Deactivate all 2FA methods for a user
   */
  async deactivateAllByUserId(userId: string): Promise<number> {
    this.logger.log(`Deactivating all 2FA for user: ${userId}`);
    const condition = and(eq(twoFactorAuth.userId, userId), eq(twoFactorAuth.isActive, true));
    if (!condition) return 0;
    const result = await this.updateMany(condition, { isActive: false });
    return result.count;
  }

  /**
   * Update backup codes for a 2FA record
   */
  async updateBackupCodes(id: string, hashedCodes: string[]): Promise<TwoFactorAuth> {
    this.logger.log(`Updating backup codes for 2FA: ${id}`);
    return this.update(id, {
      totpBackupCodes: JSON.stringify(hashedCodes),
    });
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: string): Promise<TwoFactorAuth> {
    this.logger.debug(`Updating last used for 2FA: ${id}`);
    return this.update(id, { lastUsedAt: new Date() });
  }

  /**
   * Create a new TOTP 2FA record
   */
  async createTotp(userId: string, totpSecret: string, hashedBackupCodes: string[]): Promise<TwoFactorAuth> {
    this.logger.log(`Creating TOTP 2FA for user: ${userId}`);
    return this.create({
      userId,
      method: TwoFactorMethodValues.TOTP,
      isActive: true,
      totpSecret,
      totpBackupCodes: JSON.stringify(hashedBackupCodes),
    });
  }

  /**
   * Create a new Passkey 2FA record
   */
  async createPasskey(
    userId: string,
    credentialId: string,
    publicKey: string,
    counter: number,
    transports: string[],
    hashedBackupCodes: string[],
  ): Promise<TwoFactorAuth> {
    this.logger.log(`Creating Passkey 2FA for user: ${userId}`);
    return this.create({
      userId,
      method: TwoFactorMethodValues.PASSKEY,
      isActive: true,
      passkeyCredentialId: credentialId,
      passkeyPublicKey: publicKey,
      passkeyCounter: counter,
      passkeyTransports: JSON.stringify(transports),
      totpBackupCodes: JSON.stringify(hashedBackupCodes),
    });
  }

  /**
   * Find passkey by credential ID (for authentication)
   */
  async findByCredentialId(credentialId: string): Promise<TwoFactorAuth | undefined> {
    this.logger.debug('Finding passkey by credential ID');
    return this.model.findFirst({
      where: { passkeyCredentialId: credentialId, isActive: true },
    });
  }

  /**
   * Find all passkeys for a user (for excludeCredentials)
   */
  async findAllPasskeysByUserId(userId: string): Promise<TwoFactorAuth[]> {
    this.logger.debug(`Finding all passkeys for user: ${userId}`);
    return this.model.findMany({
      where: {
        userId,
        method: TwoFactorMethodValues.PASSKEY,
        isActive: true,
      },
    });
  }

  /**
   * Update passkey counter after successful authentication
   */
  async updatePasskeyCounter(id: string, newCounter: number): Promise<TwoFactorAuth> {
    this.logger.debug(`Updating passkey counter for: ${id}`);
    return this.update(id, {
      passkeyCounter: newCounter,
      lastUsedAt: new Date(),
    });
  }
}
