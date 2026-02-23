import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues, SessionTypeValues } from '@/db/schema';
import { BackupCodeService } from '../../../mfa/services/backup-code.service';
import { MfaRepository } from '../../../mfa/repositories/mfa.repository';
import { TotpService } from '../../../mfa/services/totp.service';
import { SessionService } from '../../../auth/root/services/session.service';
import { UserService } from '../../../user/services/user.service';
import { BackupCodesResponseDto } from '../dto/response/backup-codes-response.dto';
import { TotpSetupResponseDto } from '../dto/response/totp-setup-response.dto';

@Injectable()
export class TotpSetupService {
  private readonly logger = new Logger(TotpSetupService.name);

  constructor(
    private readonly mfaRepo: MfaRepository,
    private readonly totpService: TotpService,
    private readonly backupCodeService: BackupCodeService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Generates a TOTP secret, persists a pending record in the DB, and returns the QR code
  async initiateSetup(userId: string): Promise<TotpSetupResponseDto> {
    const user = await this.userService.findById(userId);

    const existing = await this.mfaRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        label: 'MFA Already Enabled',
        detail: 'Please disable your current method before setting up a new one.',
      });
    }

    // Delete any stale pending TOTP record if the user is still in setup
    if (user.onboardingStep !== OnboardingStepValues.COMPLETE) {
      await this.mfaRepo.deletePendingByUserIdAndMethod(userId, 'TOTP');
    }

    const secret = this.totpService.generateTotpSecret();
    const keyUri = this.totpService.generateKeyUri(user.email, secret);

    await this.mfaRepo.createPendingTotp(userId, secret);

    this.logger.log(`Initiated TOTP setup for user: ${userId}`);

    return new TotpSetupResponseDto({
      keyUri,
      manualSetupKey: this.totpService.formatSecretForDisplay(secret),
      issuer: this.totpService.getIssuer(),
      accountName: user.email,
    });
  }

  // Validates the TOTP code against the pending DB record, confirms it, and completes onboarding
  async verifySetup(userId: string, code: string, sessionId: string): Promise<BackupCodesResponseDto> {
    const pending = await this.mfaRepo.findPendingByUserIdAndMethod(userId, 'TOTP');
    if (!pending || !pending.totpSecret) {
      throw new NotFoundException({
        label: 'No Pending Setup',
        detail: 'Your setup session could not be found. Please start the process again.',
      });
    }

    const isValid = this.totpService.verifyToken(code, pending.totpSecret);
    if (!isValid) {
      throw new BadRequestException({
        label: 'Invalid Code',
        detail: 'The code you entered is incorrect. Please check your authenticator app and try again.',
        errors: [{ field: 'code', message: 'Incorrect code' }],
      });
    }

    const backupCodes = this.backupCodeService.generateBackupCodes();
    const hashedBackupCodes = await this.backupCodeService.hashBackupCodes(backupCodes);

    await this.mfaRepo.confirmTotp(pending.id, JSON.stringify(hashedBackupCodes));

    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    await this.sessionService.upgradeSession(sessionId, userId, SessionTypeValues.ONBOARDING, SessionTypeValues.CLOUD);

    this.logger.log(`TOTP setup completed for user: ${userId}`);

    return new BackupCodesResponseDto({
      success: true,
      message: 'Multi-factor authentication has been enabled successfully.',
      backupCodes,
      warning:
        'Save these backup codes in a secure location. Each code can only be used once and they will not be shown again.',
    });
  }
}
