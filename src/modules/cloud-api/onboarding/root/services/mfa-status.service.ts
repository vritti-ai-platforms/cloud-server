import { Injectable, Logger } from '@nestjs/common';
import { AccountStatusValues, OnboardingStepValues, SessionTypeValues } from '@/db/schema';
import { MfaRepository } from '../../../mfa/repositories/mfa.repository';
import { SessionService } from '../../../auth/root/services/session.service';
import { UserService } from '../../../user/services/user.service';
import { MfaStatusResponseDto } from '../../totp/dto/response/mfa-status-response.dto';

@Injectable()
export class MfaStatusService {
  private readonly logger = new Logger(MfaStatusService.name);

  constructor(
    private readonly mfaRepo: MfaRepository,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Clears any pending setup and marks onboarding as complete without enabling MFA
  async skipMfaSetup(userId: string): Promise<{ success: boolean; message: string }> {
    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    await this.sessionService.upgradeSession(userId, SessionTypeValues.ONBOARDING, SessionTypeValues.CLOUD);

    this.logger.log(`User ${userId} skipped MFA setup`);

    return {
      success: true,
      message: 'Multi-factor authentication setup skipped. You can enable it later in settings.',
    };
  }

  // Retrieves the active MFA record and returns its status including backup code count
  async getMfaStatus(userId: string): Promise<MfaStatusResponseDto> {
    const mfaRecord = await this.mfaRepo.findActiveByUserId(userId);

    if (!mfaRecord) {
      return new MfaStatusResponseDto({
        isEnabled: false,
        method: null,
        backupCodesRemaining: 0,
        lastUsedAt: null,
        createdAt: null,
      });
    }

    let backupCodesRemaining = 0;
    if (mfaRecord.totpBackupCodes) {
      try {
        const codes = JSON.parse(mfaRecord.totpBackupCodes) as string[];
        backupCodesRemaining = codes.length;
      } catch (error) {
        this.logger.warn(`Failed to parse backup codes for MFA ${mfaRecord.id}: ${(error as Error).message}`);
        backupCodesRemaining = 0;
      }
    }

    return new MfaStatusResponseDto({
      isEnabled: true,
      method: mfaRecord.method,
      backupCodesRemaining,
      lastUsedAt: mfaRecord.lastUsedAt,
      createdAt: mfaRecord.createdAt,
    });
  }
}
