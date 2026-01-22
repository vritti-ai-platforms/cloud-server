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
   * May be null for QR methods until webhook receives it
   */
  phone?: string | null;

  /**
   * Phone country code
   * May be null for QR methods
   */
  phoneCountry?: string | null;

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

  /**
   * WhatsApp business number for QR code generation
   * Frontend uses this to build the universal link
   */
  whatsappNumber?: string;
}
