/**
 * Event names for mobile verification
 */
export const VERIFICATION_EVENTS = {
  MOBILE_VERIFIED: 'verification.mobile.verified',
  MOBILE_FAILED: 'verification.mobile.failed',
  MOBILE_EXPIRED: 'verification.mobile.expired',
} as const;

/**
 * Payload for mobile verification events
 */
export class MobileVerificationEvent {
  constructor(
    public readonly userId: string,
    public readonly verificationId: string,
    public readonly status: 'verified' | 'failed' | 'expired',
    public readonly phone?: string,
    public readonly message?: string,
  ) {}
}
