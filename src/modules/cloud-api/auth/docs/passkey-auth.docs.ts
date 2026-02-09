import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StartPasskeyAuthDto, VerifyPasskeyAuthDto } from '../dto/verify-passkey-auth.dto';

export function ApiStartPasskeyAuth() {
  return applyDecorators(
    ApiOperation({
      summary: 'Start passkey authentication',
      description:
        "Initiates the WebAuthn authentication flow by generating a challenge and authentication options. Optionally accepts an email to limit to the user's registered passkeys.",
    }),
    ApiBody({ type: StartPasskeyAuthDto }),
    ApiResponse({
      status: 200,
      description: 'Authentication options generated successfully.',
      schema: {
        type: 'object',
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID for the authentication flow',
            example: 'sess_abc123def456',
          },
          options: {
            type: 'object',
            description: 'WebAuthn PublicKeyCredentialRequestOptions',
            properties: {
              challenge: { type: 'string', description: 'Base64URL encoded challenge' },
              timeout: { type: 'number', description: 'Timeout in milliseconds', example: 60000 },
              rpId: { type: 'string', description: 'Relying party ID', example: 'example.com' },
              allowCredentials: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Credential ID' },
                    type: { type: 'string', example: 'public-key' },
                    transports: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              userVerification: { type: 'string', example: 'preferred' },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid request or no passkeys registered for the provided email.',
    }),
    ApiResponse({
      status: 404,
      description: 'User not found for the provided email.',
    }),
  );
}

export function ApiVerifyPasskeyAuth() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify passkey authentication',
      description:
        'Verifies the WebAuthn authentication response and creates a user session. Returns an access token and sets a refresh token in an httpOnly cookie.',
    }),
    ApiBody({ type: VerifyPasskeyAuthDto }),
    ApiResponse({
      status: 200,
      description: 'Authentication successful. Returns access token and user information.',
      schema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: 'JWT access token',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          expiresIn: { type: 'number', description: 'Token expiry in seconds', example: 900 },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'User ID', example: 'usr_123456789' },
              email: { type: 'string', description: 'User email', example: 'user@example.com' },
              firstName: { type: 'string', description: 'User first name', example: 'John' },
              lastName: { type: 'string', description: 'User last name', example: 'Doe' },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid credential or session ID.',
    }),
    ApiResponse({
      status: 401,
      description: 'Authentication failed. Invalid or expired challenge.',
    }),
    ApiResponse({
      status: 404,
      description: 'Session not found or passkey not registered.',
    }),
  );
}
