import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

// WebAuthn authentication response type
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

export class VerifyPasskeyAuthDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsObject()
  @IsNotEmpty()
  credential: AuthenticationResponseJSON;
}

export class StartPasskeyAuthDto {
  @IsString()
  @IsOptional()
  email?: string;
}
