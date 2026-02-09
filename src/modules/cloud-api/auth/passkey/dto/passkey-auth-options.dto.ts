import { ApiProperty } from '@nestjs/swagger';

// WebAuthn authentication options DTO
// Uses generic type to accept the library's return type directly
export class PasskeyAuthOptionsDto<T = unknown> {
  @ApiProperty({
    description: 'WebAuthn authentication options object containing challenge, rpId, allowCredentials, and other parameters required by the authenticator',
    example: {
      challenge: 'dGVzdC1jaGFsbGVuZ2UtYmFzZTY0',
      timeout: 60000,
      rpId: 'example.com',
      allowCredentials: [
        {
          id: 'Y3JlZGVudGlhbC1pZC1iYXNlNjQ',
          type: 'public-key',
          transports: ['internal', 'hybrid'],
        },
      ],
      userVerification: 'preferred',
    },
  })
  options: T;

  @ApiProperty({
    description: 'Unique session identifier to correlate the authentication request with the verification step',
    example: 'sess_abc123def456ghi789',
  })
  sessionId: string;

  constructor(options: T, sessionId: string) {
    this.options = options;
    this.sessionId = sessionId;
  }
}
