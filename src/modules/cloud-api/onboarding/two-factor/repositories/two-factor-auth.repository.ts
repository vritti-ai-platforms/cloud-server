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

  // Finds the active 2FA record for a user, if one exists
  async findActiveByUserId(userId: string): Promise<TwoFactorAuth | undefined> {
    this.logger.debug(`Finding active 2FA for user: ${userId}`);
    return this.model.findFirst({
      where: { userId, isActive: true },
    });
  }

  // Finds a 2FA record for a specific user and method combination
  async findByUserIdAndMethod(userId: string, method: TwoFactorMethod): Promise<TwoFactorAuth | undefined> {
    this.logger.debug(`Finding 2FA for user ${userId} with method ${method}`);
    return this.model.findFirst({
      where: { userId, method },
    });
  }

  // Deactivates all active 2FA records for a user before enabling a new method
  async deactivateAllByUserId(userId: string): Promise<number> {
    this.logger.log(`Deactivating all 2FA for user: ${userId}`);
    const condition = and(eq(twoFactorAuth.userId, userId), eq(twoFactorAuth.isActive, true));
    if (!condition) return 0;
    const result = await this.updateMany(condition, { isActive: false });
    return result.count;
  }

  // Replaces the stored backup codes with a new set of hashed codes
  async updateBackupCodes(id: string, hashedCodes: string[]): Promise<TwoFactorAuth> {
    this.logger.log(`Updating backup codes for 2FA: ${id}`);
    return this.update(id, {
      totpBackupCodes: JSON.stringify(hashedCodes),
    });
  }

  // Updates the last-used timestamp on a 2FA record
  async updateLastUsed(id: string): Promise<TwoFactorAuth> {
    this.logger.debug(`Updating last used for 2FA: ${id}`);
    return this.update(id, { lastUsedAt: new Date() });
  }

  // Creates an active TOTP-based 2FA record with the secret and backup codes
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

  // Creates an active passkey-based 2FA record with the WebAuthn credential data
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

  // Looks up an active passkey record by its WebAuthn credential ID
  async findByCredentialId(credentialId: string): Promise<TwoFactorAuth | undefined> {
    this.logger.debug('Finding passkey by credential ID');
    return this.model.findFirst({
      where: { passkeyCredentialId: credentialId, isActive: true },
    });
  }

  // Retrieves all active passkey records for a user to populate exclude lists
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

  // Updates the passkey signature counter and last-used timestamp after authentication
  async updatePasskeyCounter(id: string, newCounter: number): Promise<TwoFactorAuth> {
    this.logger.debug(`Updating passkey counter for: ${id}`);
    return this.update(id, {
      passkeyCounter: newCounter,
      lastUsedAt: new Date(),
    });
  }
}
