import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { type MfaAuth, MfaMethodValues, SessionTypeValues, type User, VerificationChannelValues } from '@/db/schema';
import { MfaRepository } from '../../../mfa/repositories/mfa.repository';
import { BackupCodeService } from '../../../mfa/services/backup-code.service';
import { TotpService } from '../../../mfa/services/totp.service';
import { WebAuthnService } from '../../../mfa/services/webauthn.service';
import type { AuthenticationResponseJSON } from '../../../mfa/types/webauthn.types';
import { UserService } from '../../../user/services/user.service';
import { VerificationService } from '../../../verification/services/verification.service';
import { SessionService } from '../../root/services/session.service';
import { MfaVerificationResponseDto, PasskeyMfaOptionsDto, SmsOtpSentResponseDto } from '../dto';
import { type MfaChallenge, MfaChallengeStore, type MfaMethod } from './mfa-challenge.store';

@Injectable()
export class MfaVerificationService {
  private readonly logger = new Logger(MfaVerificationService.name);

  constructor(
    private readonly mfaChallengeStore: MfaChallengeStore,
    private readonly totpService: TotpService,
    private readonly backupCodeService: BackupCodeService,
    private readonly verificationService: VerificationService,
    private readonly webAuthnService: WebAuthnService,
    private readonly mfaRepo: MfaRepository,
    private readonly userService: UserService,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
  ) {}

  // Creates an MFA challenge if the user has MFA enabled, returning null otherwise
  async createMfaChallenge(
    user: User,
    options: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<MfaChallenge | null> {
    // Get user's MFA settings
    const mfaRecord = await this.mfaRepo.findActiveByUserId(user.id);

    if (!mfaRecord) {
      // User doesn't have MFA enabled
      return null;
    }

    // Determine available methods
    const availableMethods: MfaMethod[] = [];

    if (mfaRecord.method === MfaMethodValues.TOTP) {
      availableMethods.push('totp');
    }

    if (mfaRecord.method === MfaMethodValues.PASSKEY) {
      availableMethods.push('passkey');
    }

    // Add SMS if user has a verified phone number
    if (user.phoneVerified && user.phone) {
      availableMethods.push('sms');
    }

    if (availableMethods.length === 0) {
      // No MFA methods available - shouldn't happen, but handle gracefully
      this.logger.warn(`User ${user.id} has MFA record but no valid methods`);
      return null;
    }

    // Create masked phone number for display
    const maskedPhone = user.phone ? this.maskPhoneNumber(user.phone, user.phoneCountry) : undefined;

    const challenge = this.mfaChallengeStore.create(user.id, availableMethods, {
      maskedPhone,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });

    this.logger.log(`Created MFA challenge for user: ${user.id}, methods: ${availableMethods.join(', ')}`);

    return challenge;
  }

  // Verifies a TOTP code or backup code against the user's MFA configuration
  async verifyTotp(sessionId: string, code: string): Promise<MfaVerificationResponseDto & { refreshToken: string }> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('totp')) {
      throw new BadRequestException({
        label: 'Method Not Available',
        detail: 'TOTP verification is not available for this session.',
      });
    }

    // Get user's MFA configuration
    const mfaRecord = await this.mfaRepo.findByUserIdAndMethod(challenge.userId, MfaMethodValues.TOTP);

    if (!mfaRecord || !mfaRecord.totpSecret) {
      throw new UnauthorizedException({
        label: 'TOTP Not Configured',
        detail: 'TOTP authentication is not properly configured for your account.',
      });
    }

    // Verify the TOTP code
    const isValid = this.totpService.verifyToken(code, mfaRecord.totpSecret);

    if (!isValid) {
      // Try backup code
      const backupResult = await this.tryBackupCode(code, mfaRecord);
      if (!backupResult.valid) {
        throw new BadRequestException({
          label: 'Invalid Code',
          errors: [{ field: 'code', message: 'Invalid verification code' }],
          detail: 'The code you entered is incorrect. Please check your authenticator app and try again.',
        });
      }
    }

    // Update last used timestamp
    await this.mfaRepo.updateLastUsed(mfaRecord.id);

    // Complete MFA verification
    return this.completeMfaVerification(challenge);
  }

  // Sends an SMS OTP to the user's verified phone number for MFA verification
  async sendSmsOtp(sessionId: string): Promise<SmsOtpSentResponseDto> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('sms')) {
      throw new BadRequestException({
        label: 'Method Not Available',
        detail: 'SMS verification is not available for this session.',
      });
    }

    // Get user to find phone number
    const user = await this.userService.findById(challenge.userId);

    if (!user || !user.phone || !user.phoneVerified) {
      throw new BadRequestException({
        label: 'Phone Not Verified',
        detail: 'SMS verification is not available because your phone number is not verified.',
      });
    }

    // Create verification record for SMS OTP
    const { otp } = await this.verificationService.createVerification(
      challenge.userId,
      VerificationChannelValues.SMS_OUT,
      user.phone,
    );

    // TODO: Actually send SMS via SMS provider (Twilio, etc.)
    // For now, log it (in development only)
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`[DEV] SMS OTP for ${user.phone}: ${otp}`);
    }

    this.logger.log(`Sent SMS OTP to user: ${challenge.userId}`);

    return new SmsOtpSentResponseDto({
      success: true,
      message: 'Verification code sent successfully',
      maskedPhone: challenge.maskedPhone || this.maskPhoneNumber(user.phone, user.phoneCountry),
    });
  }

  // Verifies the SMS OTP code against the stored hash in the MFA challenge
  async verifySmsOtp(sessionId: string, code: string): Promise<MfaVerificationResponseDto & { refreshToken: string }> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('sms')) {
      throw new BadRequestException({
        label: 'Method Not Available',
        detail: 'SMS verification is not available for this session.',
      });
    }

    const pending = await this.verificationService.findByUserIdAndChannel(
      challenge.userId,
      VerificationChannelValues.SMS_OUT,
    );

    if (!pending) {
      throw new BadRequestException({
        label: 'Code Not Requested',
        detail: 'Please request a new verification code before attempting to verify.',
      });
    }

    // Verify the OTP against the current SMS_OUT verification record
    await this.verificationService.verifyVerification(code, VerificationChannelValues.SMS_OUT, challenge.userId);

    // Complete MFA verification
    return this.completeMfaVerification(challenge);
  }

  // Generates WebAuthn authentication options for passkey-based MFA
  async startPasskeyMfa(sessionId: string): Promise<PasskeyMfaOptionsDto> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('passkey')) {
      throw new BadRequestException({
        label: 'Method Not Available',
        detail: 'Passkey verification is not available for this session.',
      });
    }

    // Get user's passkeys
    const passkeys = await this.mfaRepo.findAllPasskeysByUserId(challenge.userId);

    if (passkeys.length === 0) {
      throw new UnauthorizedException({
        label: 'No Passkeys Registered',
        detail: 'You do not have any passkeys registered for authentication.',
      });
    }

    // Generate authentication options
    // Don't pass transports hint - let browser discover the best way to reach the authenticator
    // This avoids QR code prompt when 'hybrid' transport is stored for synced passkeys
    const allowCredentials = passkeys
      .filter((pk) => pk.passkeyCredentialId)
      .map((pk) => ({ id: pk.passkeyCredentialId! }));

    const options = await this.webAuthnService.generateAuthenticationOptions(allowCredentials);

    // Store challenge
    this.mfaChallengeStore.update(sessionId, { passkeyChallenge: options.challenge });

    this.logger.log(`Started passkey MFA for user: ${challenge.userId}`);

    return new PasskeyMfaOptionsDto(options);
  }

  // Verifies a passkey authentication response and completes MFA login
  async verifyPasskeyMfa(
    sessionId: string,
    credential: AuthenticationResponseJSON,
  ): Promise<MfaVerificationResponseDto & { refreshToken: string }> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('passkey')) {
      throw new BadRequestException({
        label: 'Method Not Available',
        detail: 'Passkey verification is not available for this session.',
      });
    }

    if (!challenge.passkeyChallenge) {
      throw new BadRequestException({
        label: 'Authentication Not Started',
        detail: 'Please start passkey authentication before attempting to verify.',
      });
    }

    // Find passkey by credential ID
    const passkey = await this.mfaRepo.findByCredentialId(credential.id);

    if (!passkey) {
      throw new UnauthorizedException({
        label: 'Passkey Not Found',
        detail: 'This passkey is not registered with your account.',
      });
    }

    // Verify the passkey belongs to the user
    if (passkey.userId !== challenge.userId) {
      throw new UnauthorizedException({
        label: 'Passkey Mismatch',
        detail: 'This passkey does not belong to your account.',
      });
    }

    // Validate passkey data integrity
    if (!passkey.passkeyPublicKey || !passkey.passkeyCredentialId) {
      throw new UnauthorizedException('Passkey data is corrupted.');
    }

    // Verify authentication
    try {
      const publicKey = this.webAuthnService.base64urlToUint8Array(passkey.passkeyPublicKey);
      const transports = passkey.passkeyTransports ? JSON.parse(passkey.passkeyTransports) : undefined;

      const verification = await this.webAuthnService.verifyAuthentication(
        credential,
        challenge.passkeyChallenge,
        publicKey,
        passkey.passkeyCounter ?? 0,
        passkey.passkeyCredentialId,
        transports,
      );

      // Update counter
      await this.mfaRepo.updatePasskeyCounter(passkey.id, verification.authenticationInfo.newCounter);
    } catch (error) {
      this.logger.error(`Passkey MFA verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException({
        label: 'Passkey Verification Failed',
        detail: 'Could not verify your passkey. Please try again.',
      });
    }

    // Complete MFA verification
    return this.completeMfaVerification(challenge);
  }

  private getMfaChallengeOrThrow(sessionId: string): MfaChallenge {
    const challenge = this.mfaChallengeStore.get(sessionId);

    if (!challenge) {
      throw new BadRequestException({
        label: 'Session Expired',
        detail: 'Your MFA session has expired or is invalid. Please log in again.',
      });
    }

    return challenge;
  }

  private async tryBackupCode(code: string, mfaRecord: MfaAuth): Promise<{ valid: boolean }> {
    if (!mfaRecord.totpBackupCodes) {
      return { valid: false };
    }

    try {
      const hashedCodes = JSON.parse(mfaRecord.totpBackupCodes) as string[];
      const result = await this.backupCodeService.verifyBackupCode(code, hashedCodes);

      if (result.valid) {
        // Update remaining backup codes
        await this.mfaRepo.updateBackupCodes(mfaRecord.id, result.remainingHashes);
        this.logger.log(`Backup code used for user: ${mfaRecord.userId}`);
      }

      return { valid: result.valid };
    } catch (error) {
      this.logger.warn(`Failed to parse backup codes for MFA ${mfaRecord.id}: ${(error as Error).message}`);
      return { valid: false };
    }
  }

  private async completeMfaVerification(
    challenge: MfaChallenge,
  ): Promise<MfaVerificationResponseDto & { refreshToken: string }> {
    // Get user
    const user = await this.userService.findById(challenge.userId);

    // Create session - capture refreshToken for cookie
    const { accessToken, refreshToken, expiresIn } = await this.sessionService.createSession(
      challenge.userId,
      SessionTypeValues.CLOUD,
      challenge.ipAddress,
      challenge.userAgent,
    );

    // Clean up challenge
    this.mfaChallengeStore.delete(challenge.sessionId);

    // Update last login
    await this.userService.updateLastLogin(challenge.userId);

    this.logger.log(`MFA verification completed for user: ${challenge.userId}`);

    return {
      ...new MfaVerificationResponseDto({
        accessToken,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          displayName: user.displayName,
        },
      }),
      refreshToken, // Include for controller to set as cookie
    };
  }

  private maskPhoneNumber(phone: string, phoneCountry?: string | null): string {
    // Remove any non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Get the last 4 digits
    const lastFour = cleaned.slice(-4);

    // Get country code if present
    let countryCode = '';
    if (cleaned.startsWith('+')) {
      // Extract country code (1-3 digits after +)
      const match = cleaned.match(/^\+(\d{1,3})/);
      if (match) {
        countryCode = `+${match[1]} `;
      }
    } else if (phoneCountry) {
      countryCode = `${phoneCountry} `;
    }

    return `${countryCode}*** *** ${lastFour}`;
  }
}
