import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues } from '@/db/schema';
import type { RegistrationResponseJSON } from '../../../mfa/types/webauthn.types';
import { BackupCodeService } from '../../../mfa/services/backup-code.service';
import { MfaRepository } from '../../../mfa/repositories/mfa.repository';
import { WebAuthnService } from '../../../mfa/services/webauthn.service';
import { SessionService } from '../../../auth/root/services/session.service';
import { UserService } from '../../../user/services/user.service';
import { BackupCodesResponseDto } from '../../totp/dto/response/backup-codes-response.dto';
import { PasskeyRegistrationOptionsDto } from '../dto/response/passkey-registration-options.dto';
import { TIME_CONSTANTS } from '@/constants/time-constants';

const pendingPasskeyRegistrations = new Map<string, { challenge: string; expiresAt: Date }>();

@Injectable()
export class PasskeySetupService {
  private readonly logger = new Logger(PasskeySetupService.name);

  constructor(
    private readonly mfaRepo: MfaRepository,
    private readonly webAuthnService: WebAuthnService,
    private readonly backupCodeService: BackupCodeService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Generates WebAuthn registration options and stores the challenge in a pending map
  async initiateSetup(userId: string): Promise<PasskeyRegistrationOptionsDto> {
    const user = await this.userService.findById(userId);

    const existing = await this.mfaRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        label: 'MFA Already Enabled',
        detail: 'Please disable your current method before setting up a new one.',
      });
    }

    const existingPasskeys = await this.mfaRepo.findAllPasskeysByUserId(userId);
    const excludeCredentials = existingPasskeys
      .filter((pk) => pk.passkeyCredentialId)
      .map((pk) => ({
        id: pk.passkeyCredentialId!,
        transports: pk.passkeyTransports ? JSON.parse(pk.passkeyTransports) : undefined,
      }));

    const options = await this.webAuthnService.generateRegistrationOptions(
      userId,
      user.email,
      user.fullName || user.email,
      excludeCredentials,
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TIME_CONSTANTS.PASSKEY_PENDING_SETUP_TTL_MINUTES);
    pendingPasskeyRegistrations.set(userId, {
      challenge: options.challenge,
      expiresAt,
    });

    this.logger.log(`Initiated Passkey setup for user: ${userId}`);

    return new PasskeyRegistrationOptionsDto(options);
  }

  // Verifies the passkey registration response, stores the credential, and completes onboarding
  async verifySetup(userId: string, credential: RegistrationResponseJSON): Promise<BackupCodesResponseDto> {
    const pending = pendingPasskeyRegistrations.get(userId);
    if (!pending) {
      throw new BadRequestException({
        label: 'No Pending Setup',
        detail: 'Your setup session has expired. Please start the process again.',
      });
    }

    if (new Date() > pending.expiresAt) {
      pendingPasskeyRegistrations.delete(userId);
      throw new BadRequestException({
        label: 'Session Expired',
        detail: 'Please start the setup process again.',
      });
    }

    let verification;
    try {
      verification = await this.webAuthnService.verifyRegistration(credential, pending.challenge);
    } catch (error) {
      this.logger.error(`Passkey verification failed: ${(error as Error).message}`);
      throw new BadRequestException({
        label: 'Passkey Verification Failed',
        detail: 'Could not verify your passkey. Please try again.',
      });
    }

    const { registrationInfo } = verification;
    if (!registrationInfo) {
      throw new BadRequestException({
        label: 'Passkey Verification Failed',
        detail: 'Could not verify your passkey. Please try again.',
      });
    }

    const backupCodes = this.backupCodeService.generateBackupCodes();
    const hashedBackupCodes = await this.backupCodeService.hashBackupCodes(backupCodes);

    await this.mfaRepo.deactivateAllByUserId(userId);

    // In @simplewebauthn/server v13+, credential.id is already a base64url string
    const credentialIdBase64 = registrationInfo.credential.id;
    const publicKeyBase64 = this.webAuthnService.uint8ArrayToBase64url(registrationInfo.credential.publicKey);
    const transports = (registrationInfo.credential.transports as string[]) || [];

    await this.mfaRepo.createPasskey(
      userId,
      credentialIdBase64,
      publicKeyBase64,
      registrationInfo.credential.counter,
      transports,
      hashedBackupCodes,
    );

    pendingPasskeyRegistrations.delete(userId);

    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    await this.sessionService.upgradeToCloudSession(userId);

    this.logger.log(`Passkey setup completed for user: ${userId}`);

    return new BackupCodesResponseDto({
      success: true,
      message: 'Passkey has been registered successfully.',
      backupCodes,
      warning:
        'Save these backup codes in a secure location. Each code can only be used once and they will not be shown again.',
    });
  }

  // Clears any pending passkey registration for a user
  clearPendingSetup(userId: string): void {
    pendingPasskeyRegistrations.delete(userId);
  }
}
