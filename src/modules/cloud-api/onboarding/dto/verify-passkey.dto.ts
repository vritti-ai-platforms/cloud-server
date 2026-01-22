import { IsNotEmpty, IsObject } from 'class-validator';

// WebAuthn registration response type
interface RegistrationResponseJSON {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: string[];
  };
  authenticatorAttachment?: 'platform' | 'cross-platform';
  clientExtensionResults: Record<string, unknown>;
  type: 'public-key';
}

export class VerifyPasskeyDto {
  @IsObject()
  @IsNotEmpty()
  credential: RegistrationResponseJSON;
}
