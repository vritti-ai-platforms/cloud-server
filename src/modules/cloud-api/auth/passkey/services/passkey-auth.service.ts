import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, UnauthorizedException } from '@vritti/api-sdk';
import { TwoFactorAuthRepository } from '../../../onboarding/two-factor/repositories/two-factor-auth.repository';
import { WebAuthnService } from '../../../onboarding/two-factor/services/webauthn.service';
import { UserService } from '../../../user/services/user.service';
import { PasskeyAuthOptionsDto } from '../dto/passkey-auth-options.dto';
import { SessionService } from '../../root/services/session.service';

// Type for WebAuthn authentication response
interface AuthenticationResponseJSON {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  authenticatorAttachment?: string;
  clientExtensionResults: Record<string, unknown>;
  type: string;
}

const pendingAuthentications = new Map<
  string,
  {
    challenge: string;
    userId?: string;
    expiresAt: Date;
  }
>();
const PENDING_AUTH_TTL_MINUTES = 5;

@Injectable()
export class PasskeyAuthService {
  private readonly logger = new Logger(PasskeyAuthService.name);

  constructor(
    private readonly webAuthnService: WebAuthnService,
    private readonly twoFactorAuthRepo: TwoFactorAuthRepository,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {}

  // Generates WebAuthn authentication options, optionally scoped to a user's passkeys
  async startAuthentication(email?: string): Promise<PasskeyAuthOptionsDto> {
    let allowCredentials: Array<{ id: string; transports?: string[] }> | undefined;
    let userId: string | undefined;

    // If email provided, get user's passkeys
    if (email) {
      const user = await this.userService.findByEmail(email);
      if (user) {
        userId = user.id;
        const passkeys = await this.twoFactorAuthRepo.findAllPasskeysByUserId(user.id);
        if (passkeys.length > 0) {
          // Don't pass transports hint - let browser discover the best way
          // This avoids QR code prompt when 'hybrid' transport is stored
          allowCredentials = passkeys.map((pk) => ({
            id: pk.passkeyCredentialId!,
          }));
        }
      }
    }

    const options = await this.webAuthnService.generateAuthenticationOptions(allowCredentials as any);

    // Generate session ID for this authentication attempt
    const sessionId = crypto.randomUUID();

    // Store challenge
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PENDING_AUTH_TTL_MINUTES);
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
  ) {
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
    const passkey = await this.twoFactorAuthRepo.findByCredentialId(credential.id);
    if (!passkey) {
      throw new UnauthorizedException({
        label: 'Passkey Not Registered',
        detail: 'This passkey is not registered. Please use a different login method.',
      });
    }

    // Verify authentication
    let verification;
    try {
      const publicKey = this.webAuthnService.base64urlToUint8Array(passkey.passkeyPublicKey!);
      const transports = passkey.passkeyTransports ? JSON.parse(passkey.passkeyTransports) : undefined;

      verification = await this.webAuthnService.verifyAuthentication(
        credential as any,
        pending.challenge,
        publicKey,
        passkey.passkeyCounter ?? 0,
        passkey.passkeyCredentialId!,
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
    await this.twoFactorAuthRepo.updatePasskeyCounter(passkey.id, newCounter);

    // Clean up
    pendingAuthentications.delete(sessionId);

    // Get user
    const user = await this.userService.findById(passkey.userId);
    if (!user) {
      throw new UnauthorizedException({
        label: 'User Not Found',
        detail: 'User account not found.',
      });
    }

    // Create session
    const session = await this.sessionService.createUnifiedSession(user.id, 'CLOUD', ipAddress, userAgent);

    this.logger.log(`Passkey authentication successful for user: ${user.id}`);

    return {
      user,
      session,
    };
  }
}
