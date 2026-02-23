import { Injectable } from '@nestjs/common';
import { PrimaryBaseRepository, PrimaryDatabaseService } from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { type MfaAuth, type MfaMethod, MfaMethodValues, mfaAuth, type NewMfaAuth } from '@/db/schema';

@Injectable()
export class MfaRepository extends PrimaryBaseRepository<typeof mfaAuth> {
  constructor(database: PrimaryDatabaseService) {
    super(database, mfaAuth);
  }

  // Finds the active MFA record for a user, if one exists
  async findActiveByUserId(userId: string): Promise<MfaAuth | undefined> {
    this.logger.debug(`Finding active MFA for user: ${userId}`);
    return this.model.findFirst({
      where: { userId, isActive: true },
    });
  }

  // Finds a MFA record for a specific user and method combination
  async findByUserIdAndMethod(userId: string, method: MfaMethod): Promise<MfaAuth | undefined> {
    this.logger.debug(`Finding MFA for user ${userId} with method ${method}`);
    return this.model.findFirst({
      where: { userId, method },
    });
  }

  // Deactivates all active MFA records for a user before enabling a new method
  async deactivateAllByUserId(userId: string): Promise<number> {
    this.logger.log(`Deactivating all MFA for user: ${userId}`);
    const condition = and(eq(mfaAuth.userId, userId), eq(mfaAuth.isActive, true));
    if (!condition) return 0;
    const result = await this.updateMany(condition, { isActive: false });
    return result.count;
  }

  // Replaces the stored backup codes with a new set of hashed codes
  async updateBackupCodes(id: string, hashedCodes: string[]): Promise<MfaAuth> {
    this.logger.log(`Updating backup codes for MFA: ${id}`);
    return this.update(id, {
      totpBackupCodes: JSON.stringify(hashedCodes),
    });
  }

  // Updates the last-used timestamp on a MFA record
  async updateLastUsed(id: string): Promise<MfaAuth> {
    this.logger.debug(`Updating last used for MFA: ${id}`);
    return this.update(id, { lastUsedAt: new Date() });
  }

  // Creates an active TOTP-based MFA record with the secret and backup codes
  async createTotp(userId: string, totpSecret: string, hashedBackupCodes: string[]): Promise<MfaAuth> {
    this.logger.log(`Creating TOTP MFA for user: ${userId}`);
    return this.create({
      userId,
      method: MfaMethodValues.TOTP,
      isActive: true,
      totpSecret,
      totpBackupCodes: JSON.stringify(hashedBackupCodes),
    });
  }

  // Creates an active passkey-based MFA record with the WebAuthn credential data
  async createPasskey(
    userId: string,
    credentialId: string,
    publicKey: string,
    counter: number,
    transports: string[],
    hashedBackupCodes: string[],
  ): Promise<MfaAuth> {
    this.logger.log(`Creating Passkey MFA for user: ${userId}`);
    return this.create({
      userId,
      method: MfaMethodValues.PASSKEY,
      isActive: true,
      passkeyCredentialId: credentialId,
      passkeyPublicKey: publicKey,
      passkeyCounter: counter,
      passkeyTransports: JSON.stringify(transports),
      totpBackupCodes: JSON.stringify(hashedBackupCodes),
    });
  }

  // Looks up an active passkey record by its WebAuthn credential ID
  async findByCredentialId(credentialId: string): Promise<MfaAuth | undefined> {
    this.logger.debug('Finding passkey by credential ID');
    return this.model.findFirst({
      where: { passkeyCredentialId: credentialId, isActive: true },
    });
  }

  // Retrieves all active passkey records for a user to populate exclude lists
  async findAllPasskeysByUserId(userId: string): Promise<MfaAuth[]> {
    this.logger.debug(`Finding all passkeys for user: ${userId}`);
    return this.model.findMany({
      where: {
        userId,
        method: MfaMethodValues.PASSKEY,
        isActive: true,
      },
    });
  }

  // Updates the passkey signature counter and last-used timestamp after authentication
  async updatePasskeyCounter(id: string, newCounter: number): Promise<MfaAuth> {
    this.logger.debug(`Updating passkey counter for: ${id}`);
    return this.update(id, {
      passkeyCounter: newCounter,
      lastUsedAt: new Date(),
    });
  }

  // Finds the unconfirmed (pending) MFA record for a user and method
  async findPendingByUserIdAndMethod(userId: string, method: 'TOTP' | 'PASSKEY'): Promise<MfaAuth | undefined> {
    this.logger.debug(`Finding pending ${method} MFA for user: ${userId}`);
    return this.model.findFirst({
      where: { userId, method, isConfirmed: false },
    });
  }

  // Deletes the unconfirmed (pending) MFA record for a user and method
  async deletePendingByUserIdAndMethod(userId: string, method: 'TOTP' | 'PASSKEY'): Promise<void> {
    this.logger.log(`Deleting pending ${method} MFA for user: ${userId}`);
    const condition = and(eq(mfaAuth.userId, userId), eq(mfaAuth.method, method), eq(mfaAuth.isConfirmed, false));
    if (condition) await this.deleteMany(condition);
  }

  // Inserts a pending (unconfirmed) TOTP record with the generated secret
  async createPendingTotp(userId: string, secret: string): Promise<MfaAuth> {
    this.logger.log(`Creating pending TOTP MFA for user: ${userId}`);
    return this.create({
      userId,
      method: MfaMethodValues.TOTP,
      isActive: false,
      isConfirmed: false,
      totpSecret: secret,
    } as NewMfaAuth);
  }

  // Inserts a pending (unconfirmed) passkey record with the WebAuthn challenge
  async createPendingPasskey(userId: string, challenge: string): Promise<MfaAuth> {
    this.logger.log(`Creating pending Passkey MFA for user: ${userId}`);
    return this.create({
      userId,
      method: MfaMethodValues.PASSKEY,
      isActive: false,
      isConfirmed: false,
      pendingChallenge: challenge,
    } as NewMfaAuth);
  }

  // Confirms a pending TOTP record — marks it active and stores backup codes
  async confirmTotp(id: string, hashedBackupCodes: string): Promise<MfaAuth> {
    this.logger.log(`Confirming TOTP MFA: ${id}`);
    return this.update(id, { isActive: true, isConfirmed: true, totpBackupCodes: hashedBackupCodes });
  }

  // Confirms a pending passkey record — stores credential data, marks active, clears challenge
  async confirmPasskey(
    id: string,
    credentialId: string,
    publicKey: string,
    counter: number,
    transports: string,
    hashedBackupCodes: string,
  ): Promise<MfaAuth> {
    this.logger.log(`Confirming Passkey MFA: ${id}`);
    return this.update(id, {
      passkeyCredentialId: credentialId,
      passkeyPublicKey: publicKey,
      passkeyCounter: counter,
      passkeyTransports: transports,
      isActive: true,
      isConfirmed: true,
      pendingChallenge: null,
      totpBackupCodes: hashedBackupCodes,
    });
  }
}
