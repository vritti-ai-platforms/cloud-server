import { IsNotEmpty, IsObject, IsString } from 'class-validator';

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

export class StartPasskeyMfaDto {
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;
}

export class VerifyPasskeyMfaDto {
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;

  @IsObject()
  @IsNotEmpty({ message: 'Credential is required' })
  credential: AuthenticationResponseJSON;
}
