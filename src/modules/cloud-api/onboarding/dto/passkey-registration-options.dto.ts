// WebAuthn registration options DTO
// Uses generic type to accept the library's return type directly
export class PasskeyRegistrationOptionsDto<T = unknown> {
  options: T;

  constructor(options: T) {
    this.options = options;
  }
}
