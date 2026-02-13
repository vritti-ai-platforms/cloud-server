import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Session identifier from the passkey authentication options request',
    example: 'sess_abc123def456ghi789',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'WebAuthn authentication response containing the signed challenge and credential data',
    example: {
      id: 'Y3JlZGVudGlhbC1pZC1iYXNlNjQ',
      rawId: 'Y3JlZGVudGlhbC1pZC1iYXNlNjQ',
      response: {
        clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiZEdWemRDMWphR0ZzYkdWdVoyVXRZbUZ6WlRZMCIsIm9yaWdpbiI6Imh0dHBzOi8vZXhhbXBsZS5jb20ifQ',
        authenticatorData: 'SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAQ',
        signature: 'MEUCIQDKoFZ_Bz2nY3T0S7vM6XJ9nKXJTjK2wZ1vW9sC8nA3TAIgX5aK9pM7sQ3rT2vN6wK8jF4hL1bC0mD9eY3xZ2oA1sU',
        userHandle: 'dXNlcl8xMjM0NTY3ODkw',
      },
      authenticatorAttachment: 'platform',
      clientExtensionResults: {},
      type: 'public-key',
    },
  })
  @IsObject()
  @IsNotEmpty()
  credential: AuthenticationResponseJSON;
}

export class StartPasskeyAuthDto {
  @ApiPropertyOptional({
    description: 'User email address to identify which passkey credentials to allow. If not provided, all registered passkeys for discoverable credentials will be allowed',
    example: 'user@example.com',
    format: 'email',
  })
  @IsString()
  @IsOptional()
  email?: string;
}
