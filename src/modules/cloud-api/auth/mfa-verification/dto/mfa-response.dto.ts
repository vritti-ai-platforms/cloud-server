import type { MfaMethod } from '../mfa-challenge.store';

/**
 * MFA Challenge response - returned when login requires MFA
 */
export class MfaChallengeDto {
  sessionId: string;
  availableMethods: MfaMethod[];
  defaultMethod: MfaMethod;
  maskedPhone?: string;

  constructor(partial: Partial<MfaChallengeDto>) {
    Object.assign(this, partial);
  }
}

/**
 * MFA verification success response
 */
export class MfaVerificationResponseDto {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };

  constructor(partial: Partial<MfaVerificationResponseDto>) {
    Object.assign(this, partial);
  }
}

/**
 * Passkey MFA start response
 */
export class PasskeyMfaOptionsDto<T = unknown> {
  options: T;

  constructor(options: T) {
    this.options = options;
  }
}

/**
 * SMS OTP send response
 */
export class SmsOtpSentResponseDto {
  success: boolean;
  message: string;
  maskedPhone: string;

  constructor(partial: Partial<SmsOtpSentResponseDto>) {
    Object.assign(this, partial);
  }
}
