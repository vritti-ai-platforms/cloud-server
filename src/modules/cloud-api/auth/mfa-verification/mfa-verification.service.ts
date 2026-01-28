import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { SessionTypeValues, type TwoFactorAuth, TwoFactorMethodValues, type User } from '@/db/schema';
import { TwoFactorAuthRepository } from '../../onboarding/repositories/two-factor-auth.repository';
import { OtpService } from '../../onboarding/services/otp.service';
import { TotpService } from '../../onboarding/services/totp.service';
import { WebAuthnService } from '../../onboarding/services/webauthn.service';
import { UserService } from '../../user/user.service';
import { SessionService } from '../services/session.service';
import { MfaVerificationResponseDto, PasskeyMfaOptionsDto, SmsOtpSentResponseDto } from './dto';
import { type MfaChallenge, MfaChallengeStore, type MfaMethod } from './mfa-challenge.store';

/**
 * WebAuthn authentication response type
 */
interface AuthenticationResponseJSON {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults: Record<string, unknown>;
  type: 'public-key';
}

@Injectable()
export class MfaVerificationService {
  private readonly logger = new Logger(MfaVerificationService.name);

  constructor(
    private readonly mfaChallengeStore: MfaChallengeStore,
    private readonly totpService: TotpService,
    private readonly otpService: OtpService,
    private readonly webAuthnService: WebAuthnService,
    private readonly twoFactorAuthRepo: TwoFactorAuthRepository,
    private readonly userService: UserService,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Create an MFA challenge for a user after successful password verification
   */
  async createMfaChallenge(
    user: User,
    options: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<MfaChallenge | null> {
    // Get user's 2FA settings
    const twoFactorAuth = await this.twoFactorAuthRepo.findActiveByUserId(user.id);

    if (!twoFactorAuth) {
      // User doesn't have 2FA enabled
      return null;
    }

    // Determine available methods
    const availableMethods: MfaMethod[] = [];

    if (twoFactorAuth.method === TwoFactorMethodValues.TOTP) {
      availableMethods.push('totp');
    }

    if (twoFactorAuth.method === TwoFactorMethodValues.PASSKEY) {
      availableMethods.push('passkey');
    }

    // Add SMS if user has a verified phone number
    if (user.phoneVerified && user.phone) {
      availableMethods.push('sms');
    }

    if (availableMethods.length === 0) {
      // No 2FA methods available - shouldn't happen, but handle gracefully
      this.logger.warn(`User ${user.id} has 2FA record but no valid methods`);
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

  /**
   * Verify TOTP code
   */
  async verifyTotp(sessionId: string, code: string): Promise<{ response: MfaVerificationResponseDto; refreshToken: string }> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('totp')) {
      throw new BadRequestException('TOTP not available', 'TOTP verification is not available for this session.');
    }

    // Get user's 2FA configuration
    const twoFactorAuth = await this.twoFactorAuthRepo.findByUserIdAndMethod(
      challenge.userId,
      TwoFactorMethodValues.TOTP,
    );

    if (!twoFactorAuth || !twoFactorAuth.totpSecret) {
      throw new UnauthorizedException(
        'TOTP not configured',
        'TOTP authentication is not properly configured for your account.',
      );
    }

    // Verify the TOTP code
    const isValid = this.totpService.verifyToken(code, twoFactorAuth.totpSecret);

    if (!isValid) {
      // Try backup code
      const backupResult = await this.tryBackupCode(code, twoFactorAuth);
      if (!backupResult.valid) {
        throw new BadRequestException(
          'code',
          'Invalid verification code',
          'The code you entered is incorrect. Please check your authenticator app and try again.',
        );
      }
    }

    // Update last used timestamp
    await this.twoFactorAuthRepo.updateLastUsed(twoFactorAuth.id);

    // Complete MFA verification
    return this.completeMfaVerification(challenge);
  }

  /**
   * Send SMS OTP
   */
  async sendSmsOtp(sessionId: string): Promise<SmsOtpSentResponseDto> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('sms')) {
      throw new BadRequestException('SMS not available', 'SMS verification is not available for this session.');
    }

    // Get user to find phone number
    const user = await this.userService.findById(challenge.userId);

    if (!user || !user.phone || !user.phoneVerified) {
      throw new BadRequestException(
        'Phone not verified',
        'SMS verification is not available because your phone number is not verified.',
      );
    }

    // Generate OTP
    const otp = this.otpService.generateOtp();
    const otpHash = await this.otpService.hashOtp(otp);

    // Store OTP hash in challenge
    this.mfaChallengeStore.update(sessionId, { smsOtpHash: otpHash });

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

  /**
   * Verify SMS OTP code
   */
  async verifySmsOtp(sessionId: string, code: string): Promise<{ response: MfaVerificationResponseDto; refreshToken: string }> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('sms')) {
      throw new BadRequestException('SMS not available', 'SMS verification is not available for this session.');
    }

    if (!challenge.smsOtpHash) {
      throw new BadRequestException(
        'No OTP sent',
        'Please request a new verification code before attempting to verify.',
      );
    }

    // Verify the OTP
    const isValid = await this.otpService.verifyOtp(code, challenge.smsOtpHash);

    if (!isValid) {
      throw new BadRequestException(
        'code',
        'Invalid verification code',
        'The code you entered is incorrect. Please check your SMS and try again.',
      );
    }

    // Complete MFA verification
    return this.completeMfaVerification(challenge);
  }

  /**
   * Start passkey authentication for MFA
   */
  async startPasskeyMfa(sessionId: string): Promise<PasskeyMfaOptionsDto> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('passkey')) {
      throw new BadRequestException(
        'Passkey not available',
        'Passkey verification is not available for this session.',
      );
    }

    // Get user's passkeys
    const passkeys = await this.twoFactorAuthRepo.findAllPasskeysByUserId(challenge.userId);

    if (passkeys.length === 0) {
      throw new UnauthorizedException(
        'No passkeys registered',
        'You do not have any passkeys registered for authentication.',
      );
    }

    // Generate authentication options
    // Don't pass transports hint - let browser discover the best way to reach the authenticator
    // This avoids QR code prompt when 'hybrid' transport is stored for synced passkeys
    const allowCredentials = passkeys.map((pk) => ({
      id: pk.passkeyCredentialId!,
    }));

    const options = await this.webAuthnService.generateAuthenticationOptions(allowCredentials as any);

    // Store challenge
    this.mfaChallengeStore.update(sessionId, { passkeyChallenge: options.challenge });

    this.logger.log(`Started passkey MFA for user: ${challenge.userId}`);

    return new PasskeyMfaOptionsDto(options);
  }

  /**
   * Verify passkey authentication for MFA
   */
  async verifyPasskeyMfa(sessionId: string, credential: AuthenticationResponseJSON): Promise<{ response: MfaVerificationResponseDto; refreshToken: string }> {
    const challenge = this.getMfaChallengeOrThrow(sessionId);

    if (!challenge.availableMethods.includes('passkey')) {
      throw new BadRequestException(
        'Passkey not available',
        'Passkey verification is not available for this session.',
      );
    }

    if (!challenge.passkeyChallenge) {
      throw new BadRequestException(
        'No passkey challenge',
        'Please start passkey authentication before attempting to verify.',
      );
    }

    // Find passkey by credential ID
    const passkey = await this.twoFactorAuthRepo.findByCredentialId(credential.id);

    if (!passkey) {
      throw new UnauthorizedException(
        'Passkey not found',
        'This passkey is not registered with your account.',
      );
    }

    // Verify the passkey belongs to the user
    if (passkey.userId !== challenge.userId) {
      throw new UnauthorizedException(
        'Invalid passkey',
        'This passkey does not belong to your account.',
      );
    }

    // Verify authentication
    try {
      const publicKey = this.webAuthnService.base64urlToUint8Array(passkey.passkeyPublicKey!);
      const transports = passkey.passkeyTransports ? JSON.parse(passkey.passkeyTransports) : undefined;

      const verification = await this.webAuthnService.verifyAuthentication(
        credential as any,
        challenge.passkeyChallenge,
        publicKey,
        passkey.passkeyCounter ?? 0,
        passkey.passkeyCredentialId!,
        transports,
      );

      // Update counter
      await this.twoFactorAuthRepo.updatePasskeyCounter(passkey.id, verification.authenticationInfo.newCounter);
    } catch (error) {
      this.logger.error(`Passkey MFA verification failed: ${(error as Error).message}`);
      throw new UnauthorizedException(
        'Authentication failed',
        'Could not verify your passkey. Please try again.',
      );
    }

    // Complete MFA verification
    return this.completeMfaVerification(challenge);
  }

  /**
   * Get MFA challenge or throw error
   */
  private getMfaChallengeOrThrow(sessionId: string): MfaChallenge {
    const challenge = this.mfaChallengeStore.get(sessionId);

    if (!challenge) {
      throw new BadRequestException(
        'Invalid or expired session',
        'Your MFA session has expired or is invalid. Please log in again.',
      );
    }

    return challenge;
  }

  /**
   * Try to verify a backup code
   */
  private async tryBackupCode(
    code: string,
    twoFactorAuth: TwoFactorAuth,
  ): Promise<{ valid: boolean }> {
    if (!twoFactorAuth.totpBackupCodes) {
      return { valid: false };
    }

    try {
      const hashedCodes = JSON.parse(twoFactorAuth.totpBackupCodes) as string[];
      const result = await this.totpService.verifyBackupCode(code, hashedCodes);

      if (result.valid) {
        // Update remaining backup codes
        await this.twoFactorAuthRepo.updateBackupCodes(twoFactorAuth.id, result.remainingHashes);
        this.logger.log(`Backup code used for user: ${twoFactorAuth.userId}`);
      }

      return { valid: result.valid };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Complete MFA verification - create session and return tokens
   */
  private async completeMfaVerification(challenge: MfaChallenge): Promise<{ response: MfaVerificationResponseDto; refreshToken: string }> {
    // Get user
    const user = await this.userService.findById(challenge.userId);

    // Create session
    const { accessToken, refreshToken, expiresIn } = await this.sessionService.createUnifiedSession(
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
      response: new MfaVerificationResponseDto({
        accessToken,
        expiresIn,
        tokenType: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      }),
      refreshToken,
    };
  }

  /**
   * Mask a phone number for display (e.g., "+1 *** *** 4567")
   */
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
