import { type VerificationMethod } from '@/db/schema/enums';

/**
 * Response DTO for mobile verification status
 * Contains verification details and current status
 */
export class MobileVerificationStatusResponseDto {
  /**
   * Unique verification ID
   */
  verificationId: string;

  /**
   * Verification method being used
   */
  method: VerificationMethod;

  /**
   * Verification token to be sent via WhatsApp
   * User should reply with this token
   */
  verificationToken?: string;

  /**
   * Whether the verification is complete
   */
  isVerified: boolean;

  /**
   * Phone number being verified
   */
  phone: string;

  /**
   * Phone country code
   */
  phoneCountry: string;

  /**
   * Verification expiration timestamp
   */
  expiresAt: Date;

  /**
   * Current status message
   */
  message: string;

  /**
   * Instructions for the user
   */
  instructions?: string;
}
