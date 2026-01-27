import { ApiProperty } from '@nestjs/swagger';

// WebAuthn registration options DTO
// Uses generic type to accept the library's return type directly
export class PasskeyRegistrationOptionsDto<T = unknown> {
  @ApiProperty({
    description:
      'WebAuthn PublicKeyCredentialCreationOptions object containing challenge, relying party info, user info, and supported algorithms for passkey registration',
    example: {
      challenge: 'base64url-encoded-challenge',
      rp: { name: 'Vritti', id: 'vritti.com' },
      user: { id: 'base64url-user-id', name: 'john.doe@example.com', displayName: 'John Doe' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: { authenticatorAttachment: 'platform', requireResidentKey: false, userVerification: 'preferred' },
    },
  })
  options: T;

  constructor(options: T) {
    this.options = options;
  }
}
