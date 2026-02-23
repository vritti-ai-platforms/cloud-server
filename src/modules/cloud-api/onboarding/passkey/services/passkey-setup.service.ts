import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues } from '@/db/schema';
import { MfaRepository } from '../../../mfa/repositories/mfa.repository';
import { BackupCodeService } from '../../../mfa/services/backup-code.service';
import { WebAuthnService } from '../../../mfa/services/webauthn.service';
import type { RegistrationResponseJSON } from '../../../mfa/types/webauthn.types';
import { UserService } from '../../../user/services/user.service';
import { BackupCodesResponseDto } from '../../totp/dto/response/backup-codes-response.dto';
import { PasskeyRegistrationOptionsDto } from '../dto/response/passkey-registration-options.dto';

@Injectable()
export class PasskeySetupService {
  private readonly logger = new Logger(PasskeySetupService.name);

  constructor(
    private readonly mfaRepo: MfaRepository,
    private readonly webAuthnService: WebAuthnService,
    private readonly backupCodeService: BackupCodeService,
    private readonly userService: UserService,
  ) {}

  // Generates WebAuthn registration options and stores the challenge as a pending DB record
  async initiateSetup(userId: string): Promise<PasskeyRegistrationOptionsDto> {
    const user = await this.userService.findById(userId);

    const existing = await this.mfaRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        label: 'MFA Already Enabled',
        detail: 'Please disable your current method before setting up a new one.',
      });
    }

    // Delete any stale pending passkey record if the user is still in setup
    if (user.onboardingStep !== OnboardingStepValues.COMPLETE) {
      await this.mfaRepo.deletePendingByUserIdAndMethod(userId, 'PASSKEY');
    }

    const options = await this.webAuthnService.generateRegistrationOptions(
      userId,
      user.email,
      user.fullName || user.email,
      [],
    );

    await this.mfaRepo.createPendingPasskey(userId, options.challenge);

    this.logger.log(`Initiated Passkey setup for user: ${userId}`);

    return new PasskeyRegistrationOptionsDto(options);
  }

  // Verifies the passkey registration response against the pending DB challenge and completes onboarding
  async verifySetup(userId: string, credential: RegistrationResponseJSON): Promise<BackupCodesResponseDto> {
    const pending = await this.mfaRepo.findPendingByUserIdAndMethod(userId, 'PASSKEY');
    if (!pending || !pending.pendingChallenge) {
      throw new NotFoundException({
        label: 'No Pending Setup',
        detail: 'Your setup session could not be found. Please start the process again.',
      });
    }

    const { registrationInfo } = await this.webAuthnService
      .verifyRegistration(credential, pending.pendingChallenge)
      .catch((error: Error) => {
        this.logger.error(`Passkey verification failed: ${error.message}`);
        throw new BadRequestException({
          label: 'Passkey Verification Failed',
          detail: 'Could not verify your passkey. Please try again.',
        });
      });

    const backupCodes = this.backupCodeService.generateBackupCodes();
    const hashedBackupCodes = await this.backupCodeService.hashBackupCodes(backupCodes);

    // In @simplewebauthn/server v13+, credential.id is already a base64url string
    const credentialIdBase64 = registrationInfo.credential.id;
    const publicKeyBase64 = this.webAuthnService.uint8ArrayToBase64url(registrationInfo.credential.publicKey);
    const transports = (registrationInfo.credential.transports as string[]) || [];

    await this.mfaRepo.confirmPasskey(
      pending.id,
      credentialIdBase64,
      publicKeyBase64,
      registrationInfo.credential.counter,
      JSON.stringify(transports),
      JSON.stringify(hashedBackupCodes),
    );

    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    this.logger.log(`Passkey setup completed for user: ${userId}`);

    return new BackupCodesResponseDto({
      success: true,
      message: 'Passkey has been registered successfully.',
      backupCodes,
      warning:
        'Save these backup codes in a secure location. Each code can only be used once and they will not be shown again.',
    });
  }
}
