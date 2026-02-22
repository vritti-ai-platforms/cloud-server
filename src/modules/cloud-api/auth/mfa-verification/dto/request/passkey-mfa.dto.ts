import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString, IsUUID } from 'class-validator';
import type { AuthenticationResponseJSON } from '../../../../mfa/types/webauthn.types';

class AuthenticatorResponseDto {
  @ApiProperty({
    description: 'Base64URL-encoded client data JSON containing challenge and origin',
    example: 'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiYWJjMTIzIiwib3JpZ2luIjoiaHR0cHM6Ly9leGFtcGxlLmNvbSJ9',
  })
  clientDataJSON: string;

  @ApiProperty({
    description: 'Base64URL-encoded authenticator data containing flags and counter',
    example: 'SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAQ',
  })
  authenticatorData: string;

  @ApiProperty({
    description: 'Base64URL-encoded signature over the client data and authenticator data',
    example: 'MEUCIQDKg5kp3...',
  })
  signature: string;

  @ApiProperty({
    description: 'Base64URL-encoded user handle (user ID)',
    example: 'dXNlcl9hYmMxMjM',
    required: false,
  })
  userHandle?: string;
}

class AuthenticationResponseJSONDto {
  @ApiProperty({
    description: 'Base64URL-encoded credential identifier',
    example: 'pbK2nMnR2...',
  })
  id: string;

  @ApiProperty({
    description: 'Raw credential ID in Base64URL format (same as id)',
    example: 'pbK2nMnR2...',
  })
  rawId: string;

  @ApiProperty({
    description: 'Authenticator response containing the cryptographic proof',
    type: AuthenticatorResponseDto,
  })
  response: AuthenticatorResponseDto;

  @ApiProperty({
    description: 'Type of authenticator attachment used',
    example: 'platform',
    enum: ['platform', 'cross-platform'],
    required: false,
  })
  authenticatorAttachment?: 'platform' | 'cross-platform';

  @ApiProperty({
    description: 'Results from client-side WebAuthn extensions',
    example: {},
  })
  clientExtensionResults: Record<string, unknown>;

  @ApiProperty({
    description: 'Credential type (always "public-key" for WebAuthn)',
    example: 'public-key',
    enum: ['public-key'],
  })
  type: 'public-key';
}

export class StartPasskeyMfaDto {
  @ApiProperty({
    description: 'MFA session identifier obtained from the login challenge response',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;
}

export class VerifyPasskeyMfaDto {
  @ApiProperty({
    description: 'MFA session identifier obtained from the login challenge response',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;

  @ApiProperty({
    description: 'WebAuthn authentication response from navigator.credentials.get()',
    type: AuthenticationResponseJSONDto,
  })
  @IsObject()
  @IsNotEmpty({ message: 'Credential is required' })
  credential: AuthenticationResponseJSON;
}
