import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { MfaRepository } from '../../../mfa/repositories/mfa.repository';
import { WebAuthnService } from '../../../mfa/services/webauthn.service';
import type { AuthenticatorTransportFuture, AuthenticationResponseJSON } from '../../../mfa/types/webauthn.types';
import { UserService } from '../../../user/services/user.service';
import { PasskeyAuthOptionsDto } from '../dto/response/passkey-auth-options.dto';
import { PasskeyAuthResponseDto } from '../dto/response/passkey-auth-response.dto';
import { SessionService } from '../../root/services/session.service';
import { TIME_CONSTANTS } from '@/constants/time-constants';

const pendingAuthentications = new Map<
  string,
  {
    challenge: string;
    userId?: string;
    expiresAt: Date;
  }
>();

@Injectable()
export class PasskeyAuthService {
  private readonly logger = new Logger(PasskeyAuthService.name);

  constructor(
    private readonly webAuthnService: WebAuthnService,
    private readonly mfaRepo: MfaRepository,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Generates WebAuthn authentication options, optionally scoped to a user's passkeys
  async startAuthentication(email?: string): Promise<PasskeyAuthOptionsDto> {
    let allowCredentials: Array<{ id: string; transports?: AuthenticatorTransportFuture[] }> | undefined;
    let userId: string | undefined;

    // If email provided, get user's passkeys
    if (email) {
      const user = await this.userService.findByEmail(email);
      if (user) {
        userId = user.id;
        const passkeys = await this.mfaRepo.findAllPasskeysByUserId(user.id);
        if (passkeys.length > 0) {
          // Don't pass transports hint - let browser discover the best way
          // This avoids QR code prompt when 'hybrid' transport is stored
          allowCredentials = passkeys
            .filter((pk) => pk.passkeyCredentialId)
            .map((pk) => ({ id: pk.passkeyCredentialId! }));
        }
      }
    }

    const options = await this.webAuthnService.generateAuthenticationOptions(allowCredentials);

    // Generate session ID for this authentication attempt
    const sessionId = crypto.randomUUID();

    // Store challenge
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TIME_CONSTANTS.PASSKEY_AUTH_CHALLENGE_TTL_MINUTES);
    pendingAuthentications.set(sessionId, {
      challenge: options.challenge,
      userId,
      expiresAt,
    });

    this.logger.log(`Started passkey authentication, sessionId: ${sessionId}`);

    return new PasskeyAuthOptionsDto(options, sessionId);
  }

  // Verifies the passkey credential, updates the counter, and creates a session
  async verifyAuthentication(
    sessionId: string,
    credential: AuthenticationResponseJSON,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PasskeyAuthResponseDto> {
    // Get pending authentication
    const pending = pendingAuthentications.get(sessionId);
    if (!pending) {
      throw new BadRequestException({
        label: 'Session Not Found',
        detail: 'Your login session has expired. Please try again.',
      });
    }

    // Check expiry
    if (new Date() > pending.expiresAt) {
      pendingAuthentications.delete(sessionId);
      throw new BadRequestException({
        label: 'Session Expired',
        detail: 'Your login session has expired. Please try again.',
      });
    }

    // Find passkey by credential ID
    const passkey = await this.mfaRepo.findByCredentialId(credential.id);
    if (!passkey) {
      throw new UnauthorizedException({
        label: 'Passkey Not Registered',
        detail: 'This passkey is not registered. Please use a different login method.',
      });
    }

    // Validate passkey data integrity
    if (!passkey.passkeyPublicKey || !passkey.passkeyCredentialId) {
      throw new UnauthorizedException('Passkey data is corrupted.');
    }

    // Verify authentication
    let verification;
    try {
      const publicKey = this.webAuthnService.base64urlToUint8Array(passkey.passkeyPublicKey);
      const transports = passkey.passkeyTransports ? JSON.parse(passkey.passkeyTransports) : undefined;

      verification = await this.webAuthnService.verifyAuthentication(
        credential,
        pending.challenge,
        publicKey,
        passkey.passkeyCounter ?? 0,
        passkey.passkeyCredentialId,
        transports,
      );
    } catch (error) {
      this.logger.error(`Passkey authentication failed: ${(error as Error).message}`);
      throw new UnauthorizedException({
        label: 'Passkey Verification Failed',
        detail: 'Could not verify your passkey. Please try again.',
      });
    }

    // Update counter (replay protection)
    const newCounter = verification.authenticationInfo.newCounter;
    await this.mfaRepo.updatePasskeyCounter(passkey.id, newCounter);

    // Clean up
    pendingAuthentications.delete(sessionId);

    // Get user (findById throws NotFoundException if not found)
    const user = await this.userService.findById(passkey.userId);

    // Create session
    const session = await this.sessionService.createSession(user.id, 'CLOUD', ipAddress, userAgent);

    this.logger.log(`Passkey authentication successful for user: ${user.id}`);

    return new PasskeyAuthResponseDto({
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        displayName: user.displayName,
      },
    });
  }
}
