import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues } from '@/db/schema';
import { SessionService } from '../../../auth/root/services/session.service';
import { UserService } from '../../../user/services/user.service';
import { BackupCodesResponseDto } from '../dto/response/backup-codes-response.dto';
import { PasskeyRegistrationOptionsDto } from '../dto/response/passkey-registration-options.dto';
import { TotpSetupResponseDto } from '../dto/response/totp-setup-response.dto';
import { TwoFactorStatusResponseDto } from '../dto/response/two-factor-status-response.dto';
import { TwoFactorAuthRepository } from '../repositories/two-factor-auth.repository';
import { TotpService } from './totp.service';
import { WebAuthnService } from './webauthn.service';

interface RegistrationResponseJSON {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
  authenticatorAttachment?: string;
  clientExtensionResults: Record<string, unknown>;
  type: string;
}

const pendingSetups = new Map<string, { secret: string; expiresAt: Date }>();
const PENDING_SETUP_TTL_MINUTES = 10;

const pendingPasskeyRegistrations = new Map<string, { challenge: string; expiresAt: Date }>();
const PENDING_PASSKEY_TTL_MINUTES = 5;

@Injectable()
export class TwoFactorAuthService {
  private readonly logger = new Logger(TwoFactorAuthService.name);

  constructor(
    private readonly twoFactorAuthRepo: TwoFactorAuthRepository,
    private readonly totpService: TotpService,
    private readonly webAuthnService: WebAuthnService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Generates a TOTP secret, stores it in a pending map, and returns the QR code
  async initiateTotpSetup(userId: string): Promise<TotpSetupResponseDto> {
    const user = await this.userService.findById(userId);

    const existing = await this.twoFactorAuthRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        label: '2FA Already Enabled',
        detail: 'Please disable your current method before setting up a new one.',
      });
    }

    const secret = this.totpService.generateTotpSecret();
    const keyUri = this.totpService.generateKeyUri(user.email, secret);
    const qrCodeDataUrl = await this.totpService.generateQrCodeDataUrl(keyUri);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PENDING_SETUP_TTL_MINUTES);
    pendingSetups.set(userId, { secret, expiresAt });

    this.logger.log(`Initiated TOTP setup for user: ${userId}`);

    return new TotpSetupResponseDto({
      qrCodeDataUrl,
      manualSetupKey: this.totpService.formatSecretForDisplay(secret),
      issuer: 'Vritti',
      accountName: user.email,
    });
  }

  // Validates the TOTP token, persists the secret, generates backup codes, and completes onboarding
  async verifyTotpSetup(userId: string, token: string): Promise<BackupCodesResponseDto> {
    const pending = pendingSetups.get(userId);
    if (!pending) {
      throw new BadRequestException({
        label: 'No Pending Setup',
        detail: 'Your setup session has expired. Please start the process again.',
      });
    }

    
    if (new Date() > pending.expiresAt) {
      pendingSetups.delete(userId);
      throw new BadRequestException({
        label: 'Session Expired',
        detail: 'Please start the setup process again.',
      });
    }

    const isValid = this.totpService.verifyToken(token, pending.secret);
    if (!isValid) {
      throw new BadRequestException({
        label: 'Invalid Code',
        detail: 'The code you entered is incorrect. Please check your authenticator app and try again.',
        errors: [{ field: 'code', message: 'Incorrect code' }],
      });
    }

    const backupCodes = this.totpService.generateBackupCodes();
    const hashedBackupCodes = await this.totpService.hashBackupCodes(backupCodes);

    await this.twoFactorAuthRepo.deactivateAllByUserId(userId);

    await this.twoFactorAuthRepo.createTotp(userId, pending.secret, hashedBackupCodes);

    pendingSetups.delete(userId);

    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    await this.sessionService.upgradeToCloudSession(userId);

    this.logger.log(`TOTP setup completed for user: ${userId}`);

    return new BackupCodesResponseDto({
      success: true,
      message: 'Two-factor authentication has been enabled successfully.',
      backupCodes,
      warning:
        'Save these backup codes in a secure location. Each code can only be used once and they will not be shown again.',
    });
  }

  // Clears any pending setup and marks onboarding as complete without enabling 2FA
  async skip2FASetup(userId: string): Promise<void> {
    pendingSetups.delete(userId);

    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    await this.sessionService.upgradeToCloudSession(userId);

    this.logger.log(`User ${userId} skipped 2FA setup`);
  }

  // Retrieves the active 2FA record and returns its status including backup code count
  async get2FAStatus(userId: string): Promise<TwoFactorStatusResponseDto> {
    const twoFactorAuth = await this.twoFactorAuthRepo.findActiveByUserId(userId);

    if (!twoFactorAuth) {
      return new TwoFactorStatusResponseDto({
        isEnabled: false,
        method: null,
        backupCodesRemaining: 0,
        lastUsedAt: null,
        createdAt: null,
      });
    }

    let backupCodesRemaining = 0;
    if (twoFactorAuth.totpBackupCodes) {
      try {
        const codes = JSON.parse(twoFactorAuth.totpBackupCodes) as string[];
        backupCodesRemaining = codes.length;
      } catch {
        backupCodesRemaining = 0;
      }
    }

    return new TwoFactorStatusResponseDto({
      isEnabled: true,
      method: twoFactorAuth.method,
      backupCodesRemaining,
      lastUsedAt: twoFactorAuth.lastUsedAt,
      createdAt: twoFactorAuth.createdAt,
    });
  }

  // Generates WebAuthn registration options and stores the challenge in a pending map
  async initiatePasskeySetup(userId: string): Promise<PasskeyRegistrationOptionsDto> {
    const user = await this.userService.findById(userId);

    const existing = await this.twoFactorAuthRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        label: '2FA Already Enabled',
        detail: 'Please disable your current method before setting up a new one.',
      });
    }

    const existingPasskeys = await this.twoFactorAuthRepo.findAllPasskeysByUserId(userId);
    const excludeCredentials = existingPasskeys.map((pk) => ({
      id: pk.passkeyCredentialId!,
      transports: pk.passkeyTransports ? JSON.parse(pk.passkeyTransports) : undefined,
    }));

    const options = await this.webAuthnService.generateRegistrationOptions(
      userId,
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      excludeCredentials,
    );

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PENDING_PASSKEY_TTL_MINUTES);
    pendingPasskeyRegistrations.set(userId, {
      challenge: options.challenge,
      expiresAt,
    });

    this.logger.log(`Initiated Passkey setup for user: ${userId}`);

    return new PasskeyRegistrationOptionsDto(options);
  }

  // Verifies the passkey registration response, stores the credential, and completes onboarding
  async verifyPasskeySetup(userId: string, credential: RegistrationResponseJSON): Promise<BackupCodesResponseDto> {
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
      verification = await this.webAuthnService.verifyRegistration(credential as any, pending.challenge);
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

    const backupCodes = this.totpService.generateBackupCodes();
    const hashedBackupCodes = await this.totpService.hashBackupCodes(backupCodes);

    await this.twoFactorAuthRepo.deactivateAllByUserId(userId);

    // In @simplewebauthn/server v13+, credential.id is already a base64url string
    const credentialIdBase64 = registrationInfo.credential.id;
    const publicKeyBase64 = this.webAuthnService.uint8ArrayToBase64url(registrationInfo.credential.publicKey);
    const transports = (registrationInfo.credential.transports as string[]) || [];

    await this.twoFactorAuthRepo.createPasskey(
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
}
