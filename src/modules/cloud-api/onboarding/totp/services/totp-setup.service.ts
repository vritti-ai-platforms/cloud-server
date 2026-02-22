import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues, SessionTypeValues } from '@/db/schema';
import { BackupCodeService } from '../../../mfa/services/backup-code.service';
import { MfaRepository } from '../../../mfa/repositories/mfa.repository';
import { TotpService } from '../../../mfa/services/totp.service';
import { SessionService } from '../../../auth/root/services/session.service';
import { UserService } from '../../../user/services/user.service';
import { BackupCodesResponseDto } from '../dto/response/backup-codes-response.dto';
import { TotpSetupResponseDto } from '../dto/response/totp-setup-response.dto';
import { TIME_CONSTANTS } from '@/constants/time-constants';
import { TotpPendingStore } from './totp-pending.store';

@Injectable()
export class TotpSetupService {
  private readonly logger = new Logger(TotpSetupService.name);

  constructor(
    private readonly mfaRepo: MfaRepository,
    private readonly totpService: TotpService,
    private readonly backupCodeService: BackupCodeService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly totpPendingStore: TotpPendingStore,
  ) {}

  // Generates a TOTP secret, stores it in a pending map, and returns the QR code
  async initiateSetup(userId: string): Promise<TotpSetupResponseDto> {
    const user = await this.userService.findById(userId);

    const existing = await this.mfaRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        label: 'MFA Already Enabled',
        detail: 'Please disable your current method before setting up a new one.',
      });
    }

    const secret = this.totpService.generateTotpSecret();
    const keyUri = this.totpService.generateKeyUri(user.email, secret);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TIME_CONSTANTS.TOTP_PENDING_SETUP_TTL_MINUTES);
    this.totpPendingStore.set(userId, secret, expiresAt);

    this.logger.log(`Initiated TOTP setup for user: ${userId}`);

    return new TotpSetupResponseDto({
      keyUri,
      manualSetupKey: this.totpService.formatSecretForDisplay(secret),
      issuer: this.totpService.getIssuer(),
      accountName: user.email,
    });
  }

  // Validates the TOTP code, persists the secret, generates backup codes, and completes onboarding
  async verifySetup(userId: string, code: string): Promise<BackupCodesResponseDto> {
    const pending = this.totpPendingStore.get(userId);
    if (!pending) {
      throw new BadRequestException({
        label: 'No Pending Setup',
        detail: 'Your setup session has expired. Please start the process again.',
      });
    }

    const isValid = this.totpService.verifyToken(code, pending.secret);
    if (!isValid) {
      throw new BadRequestException({
        label: 'Invalid Code',
        detail: 'The code you entered is incorrect. Please check your authenticator app and try again.',
        errors: [{ field: 'code', message: 'Incorrect code' }],
      });
    }

    const backupCodes = this.backupCodeService.generateBackupCodes();
    const hashedBackupCodes = await this.backupCodeService.hashBackupCodes(backupCodes);

    await this.mfaRepo.deactivateAllByUserId(userId);
    await this.mfaRepo.createTotp(userId, pending.secret, hashedBackupCodes);

    this.totpPendingStore.delete(userId);

    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    await this.sessionService.upgradeSession(userId, SessionTypeValues.ONBOARDING, SessionTypeValues.CLOUD);

    this.logger.log(`TOTP setup completed for user: ${userId}`);

    return new BackupCodesResponseDto({
      success: true,
      message: 'Multi-factor authentication has been enabled successfully.',
      backupCodes,
      warning:
        'Save these backup codes in a secure location. Each code can only be used once and they will not be shown again.',
    });
  }

  // Clears any pending TOTP setup for a user
  clearPendingSetup(userId: string): void {
    this.totpPendingStore.delete(userId);
  }
}
