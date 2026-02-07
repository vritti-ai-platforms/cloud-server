import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException } from '@vritti/api-sdk';
import { AccountStatusValues, OnboardingStepValues } from '@/db/schema';
import { UserService } from '../../user/user.service';
import { BackupCodesResponseDto } from '../dto/backup-codes-response.dto';
import { PasskeyRegistrationOptionsDto } from '../dto/passkey-registration-options.dto';
import { TotpSetupResponseDto } from '../dto/totp-setup-response.dto';
import { TwoFactorStatusResponseDto } from '../dto/two-factor-status-response.dto';
import { TwoFactorAuthRepository } from '../repositories/two-factor-auth.repository';
import { TotpService } from './totp.service';
import { WebAuthnService } from './webauthn.service';

// Type for WebAuthn registration response (inline to avoid import issues)
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

/**
 * In-memory store for pending TOTP setups (secret stored temporarily before verification)
 * In production, consider using Redis with TTL for distributed systems
 */
const pendingSetups = new Map<string, { secret: string; expiresAt: Date }>();
const PENDING_SETUP_TTL_MINUTES = 10;

/**
 * In-memory store for pending Passkey registrations (challenge stored temporarily before verification)
 */
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
  ) {}

  /**
   * Initiate TOTP setup - generates secret and QR code
   * Secret is stored temporarily until verified
   */
  async initiateTotpSetup(userId: string): Promise<TotpSetupResponseDto> {
    const user = await this.userService.findById(userId);

    // Check if user already has active 2FA
    const existing = await this.twoFactorAuthRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        label: '2FA Already Enabled',
        detail: 'Please disable your current method before setting up a new one.',
      });
    }

    // Generate new secret
    const secret = this.totpService.generateTotpSecret();
    const keyUri = this.totpService.generateKeyUri(user.email, secret);
    const qrCodeDataUrl = await this.totpService.generateQrCodeDataUrl(keyUri);

    // Store secret temporarily (pending verification)
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

  /**
   * Verify TOTP setup - validates token and stores secret
   * Returns backup codes on success
   */
  async verifyTotpSetup(userId: string, token: string): Promise<BackupCodesResponseDto> {
    // Get pending setup
    const pending = pendingSetups.get(userId);
    if (!pending) {
      throw new BadRequestException({
        label: 'No Pending Setup',
        detail: 'Your setup session has expired. Please start the process again.',
      });
    }


    
    // Check if expired
    if (new Date() > pending.expiresAt) {
      pendingSetups.delete(userId);
      throw new BadRequestException({
        label: 'Session Expired',
        detail: 'Please start the setup process again.',
      });
    }

    // Verify the token
    const isValid = this.totpService.verifyToken(token, pending.secret);
    if (!isValid) {
      throw new BadRequestException({
        label: 'Invalid Code',
        detail: 'The code you entered is incorrect. Please check your authenticator app and try again.',
        errors: [{ field: 'code', message: 'Incorrect code' }],
      });
    }

    // Generate backup codes
    const backupCodes = this.totpService.generateBackupCodes();
    const hashedBackupCodes = await this.totpService.hashBackupCodes(backupCodes);

    // Deactivate any existing 2FA methods
    await this.twoFactorAuthRepo.deactivateAllByUserId(userId);

    // Store the verified 2FA configuration
    await this.twoFactorAuthRepo.createTotp(userId, pending.secret, hashedBackupCodes);

    // Clean up pending setup
    pendingSetups.delete(userId);

    // Update user onboarding step to COMPLETE
    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    this.logger.log(`TOTP setup completed for user: ${userId}`);

    return new BackupCodesResponseDto({
      success: true,
      message: 'Two-factor authentication has been enabled successfully.',
      backupCodes,
      warning:
        'Save these backup codes in a secure location. Each code can only be used once and they will not be shown again.',
    });
  }

  /**
   * Skip 2FA setup - completes onboarding without 2FA
   */
  async skip2FASetup(userId: string): Promise<void> {
    // Clean up any pending setup
    pendingSetups.delete(userId);

    // Update user onboarding step to COMPLETE
    await this.userService.update(userId, {
      onboardingStep: OnboardingStepValues.COMPLETE,
      accountStatus: AccountStatusValues.ACTIVE,
    });

    this.logger.log(`User ${userId} skipped 2FA setup`);
  }

  /**
   * Get current 2FA status for a user
   */
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

    // Count remaining backup codes
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

  /**
   * Initiate Passkey setup - generates registration options
   */
  async initiatePasskeySetup(userId: string): Promise<PasskeyRegistrationOptionsDto> {
    const user = await this.userService.findById(userId);

    // Check if user already has active 2FA
    const existing = await this.twoFactorAuthRepo.findActiveByUserId(userId);
    if (existing) {
      throw new BadRequestException({
        label: '2FA Already Enabled',
        detail: 'Please disable your current method before setting up a new one.',
      });
    }

    // Get existing passkeys to exclude (prevent re-registration)
    const existingPasskeys = await this.twoFactorAuthRepo.findAllPasskeysByUserId(userId);
    const excludeCredentials = existingPasskeys.map((pk) => ({
      id: pk.passkeyCredentialId!,
      transports: pk.passkeyTransports ? JSON.parse(pk.passkeyTransports) : undefined,
    }));

    // Generate registration options
    const options = await this.webAuthnService.generateRegistrationOptions(
      userId,
      user.email,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      excludeCredentials,
    );

    // Store challenge temporarily
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PENDING_PASSKEY_TTL_MINUTES);
    pendingPasskeyRegistrations.set(userId, {
      challenge: options.challenge,
      expiresAt,
    });

    this.logger.log(`Initiated Passkey setup for user: ${userId}`);

    return new PasskeyRegistrationOptionsDto(options);
  }

  /**
   * Verify Passkey setup - validates credential and returns backup codes
   */
  async verifyPasskeySetup(userId: string, credential: RegistrationResponseJSON): Promise<BackupCodesResponseDto> {
    // Get pending registration
    const pending = pendingPasskeyRegistrations.get(userId);
    if (!pending) {
      throw new BadRequestException({
        label: 'No Pending Setup',
        detail: 'Your setup session has expired. Please start the process again.',
      });
    }

    // Check if expired
    if (new Date() > pending.expiresAt) {
      pendingPasskeyRegistrations.delete(userId);
      throw new BadRequestException({
        label: 'Session Expired',
        detail: 'Please start the setup process again.',
      });
    }

    // Verify the registration
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

    // Generate backup codes (same as TOTP)
    const backupCodes = this.totpService.generateBackupCodes();
    const hashedBackupCodes = await this.totpService.hashBackupCodes(backupCodes);

    // Deactivate any existing 2FA methods
    await this.twoFactorAuthRepo.deactivateAllByUserId(userId);

    // Store the passkey
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

    // Clean up pending registration
    pendingPasskeyRegistrations.delete(userId);

    // Update user onboarding step to COMPLETE
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
