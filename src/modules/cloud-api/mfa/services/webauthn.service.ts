import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import type { AuthenticatorTransportFuture, AuthenticationResponseJSON, RegistrationResponseJSON } from '../types/webauthn.types';

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

  // Builds WebAuthn registration options with platform authenticator preferences
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
      attestationType: 'none',
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.id,
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform',
      },
      supportedAlgorithmIDs: [-7, -257],
      timeout: 300000,
    });

    this.logger.debug(`Generated registration options for user: ${userId}`);
    return options;
  }

  // Verifies the registration response against the expected challenge and origin
  async verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Passkey registration verification failed');
    }

    this.logger.debug('Registration verified successfully');
    return verification;
  }

  // Builds WebAuthn authentication options for existing credential assertion
  async generateAuthenticationOptions(
    allowCredentials?: Array<{ id: string; transports?: AuthenticatorTransportFuture[] }>,
  ) {
    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: 'preferred',
      timeout: 300000,
      allowCredentials: allowCredentials?.map((cred) => ({
        id: cred.id,
        transports: cred.transports,
      })),
    });

    this.logger.debug('Generated authentication options');
    return options;
  }

  // Verifies the authentication response against the stored credential and challenge
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

  // Converts a base64url-encoded string to a Uint8Array buffer
  base64urlToUint8Array(base64url: string): Uint8Array {
    return isoBase64URL.toBuffer(base64url);
  }

  // Converts a Uint8Array buffer to a base64url-encoded string
  uint8ArrayToBase64url(buffer: Uint8Array): string {
    return isoBase64URL.fromBuffer(new Uint8Array(buffer) as Uint8Array<ArrayBuffer>);
  }
}
