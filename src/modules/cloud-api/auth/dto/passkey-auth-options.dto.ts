// WebAuthn authentication options DTO
// Uses generic type to accept the library's return type directly
export class PasskeyAuthOptionsDto<T = unknown> {
  options: T;
  sessionId: string;

  constructor(options: T, sessionId: string) {
    this.options = options;
    this.sessionId = sessionId;
  }
}
