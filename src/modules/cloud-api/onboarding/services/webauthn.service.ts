import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';

// Type definitions for WebAuthn
type AuthenticatorTransportFuture = 'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';

interface PublicKeyCredentialCreationOptionsJSON {
  rp: { name: string; id?: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: Array<{ alg: number; type: 'public-key' }>;
  timeout?: number;
  excludeCredentials?: Array<{ id: string; type: 'public-key'; transports?: AuthenticatorTransportFuture[] }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey?: 'discouraged' | 'preferred' | 'required';
    requireResidentKey?: boolean;
    userVerification?: 'discouraged' | 'preferred' | 'required';
  };
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
  extensions?: Record<string, unknown>;
}

interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{ id: string; type: 'public-key'; transports?: AuthenticatorTransportFuture[] }>;
  userVerification?: 'discouraged' | 'preferred' | 'required';
  extensions?: Record<string, unknown>;
}

interface RegistrationResponseJSON {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: AuthenticatorTransportFuture[];
  };
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults: Record<string, unknown>;
  type: 'public-key';
}

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
export class WebAuthnService {
  private readonly logger = new Logger(WebAuthnService.name);
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly origin: string;

  constructor(private readonly configService: ConfigService) {
    this.rpName = this.configService.get<string>('WEBAUTHN_RP_NAME', 'Vritti');
    this.rpID = this.configService.get<string>('WEBAUTHN_RP_ID', 'localhost');
    this.origin = this.configService.get<string>('WEBAUTHN_ORIGIN', 'http://localhost:3012');

    this.logger.log(`WebAuthn initialized - RP: ${this.rpName}, ID: ${this.rpID}, Origin: ${this.origin}`);
  }

  /**
   * Generate registration options for creating a new passkey
   */
  async generateRegistrationOptions(
    userId: string,
    userEmail: string,
    userName: string,
    existingCredentials: Array<{ id: string; transports?: AuthenticatorTransportFuture[] }> = [],
  ) {
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: userEmail,
      userDisplayName: userName || userEmail,
      userID: isoUint8Array.fromUTF8String(userId),
      attestationType: 'none', // Don't require attestation (better UX)
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.id,
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred', // Discoverable credential for passwordless
        userVerification: 'required', // Require biometric/PIN verification
        authenticatorAttachment: 'platform', // Prefer built-in (Touch ID, Face ID)
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
      timeout: 300000, // 5 minutes
    });

    this.logger.debug(`Generated registration options for user: ${userId}`);
    return options;
  }

  /**
   * Verify registration response from browser
   */
  async verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      requireUserVerification: true, // Require biometric/PIN verification
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Passkey registration verification failed');
    }

    this.logger.debug('Registration verified successfully');
    return verification;
  }

  /**
   * Generate authentication options for passkey login
   */
  async generateAuthenticationOptions(
    allowCredentials?: Array<{ id: string; transports?: AuthenticatorTransportFuture[] }>,
  ) {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
      timeout: 300000, // 5 minutes
      allowCredentials: allowCredentials?.map((cred) => ({
        id: cred.id,
        transports: cred.transports,
      })),
    });

    this.logger.debug('Generated authentication options');
    return options;
  }

  /**
   * Verify authentication response from browser
   */
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credentialPublicKey: Uint8Array,
    credentialCounter: number,
    credentialId: string,
    transports?: AuthenticatorTransportFuture[],
  ) {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      requireUserVerification: false,
      credential: {
        id: credentialId,
        publicKey: new Uint8Array(credentialPublicKey) as Uint8Array<ArrayBuffer>,
        counter: credentialCounter,
        transports,
      },
    });

    if (!verification.verified) {
      throw new Error('Passkey authentication verification failed');
    }

    this.logger.debug('Authentication verified successfully');
    return verification;
  }

  /**
   * Convert base64url string to Uint8Array
   */
  base64urlToUint8Array(base64url: string): Uint8Array {
    return isoBase64URL.toBuffer(base64url);
  }

  /**
   * Convert Uint8Array to base64url string for storage
   */
  uint8ArrayToBase64url(buffer: Uint8Array): string {
    return isoBase64URL.fromBuffer(new Uint8Array(buffer) as Uint8Array<ArrayBuffer>);
  }
}
