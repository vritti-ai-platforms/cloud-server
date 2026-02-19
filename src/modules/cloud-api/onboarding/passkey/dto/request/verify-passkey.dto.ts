import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';
import type { RegistrationResponseJSON } from '../../../../mfa/types/webauthn.types';

export class VerifyPasskeyDto {
  @ApiProperty({
    description: 'WebAuthn credential registration response from the browser containing attestation data',
    example: {
      id: 'base64url-credential-id',
      rawId: 'base64url-raw-credential-id',
      response: {
        clientDataJSON: 'base64url-client-data',
        attestationObject: 'base64url-attestation-object',
        transports: ['internal', 'hybrid'],
      },
      authenticatorAttachment: 'platform',
      clientExtensionResults: {},
      type: 'public-key',
    },
  })
  @IsObject()
  @IsNotEmpty()
  credential: RegistrationResponseJSON;
}
