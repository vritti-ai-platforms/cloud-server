import { type VerificationMethod } from '@/db/schema/enums';

/**
 * Result of sending a verification message
 */
export interface SendVerificationResult {
  /** Message ID from the provider (e.g., WhatsApp message ID, SMS message ID) */
  messageId?: string;
  /** Whether the message was sent successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Verification Provider Interface
 * Defines the contract for different verification methods (WhatsApp, SMS Inbound, SMS OTP)
 *
 * Strategy Pattern: Each provider implements this interface to handle its specific verification flow
 */
export interface VerificationProvider {
  /**
   * The verification method this provider handles
   */
  readonly method: VerificationMethod;

  /**
   * Send verification message to the user
   *
   * @param phone Phone number in E.164 format (with + prefix)
   * @param phoneCountry ISO country code (e.g., IN, US)
   * @param token Verification token or OTP to send
   * @returns Result of the send operation
   */
  sendVerification(phone: string, phoneCountry: string, token: string): Promise<SendVerificationResult>;

  /**
   * Validate webhook signature (for inbound methods only)
   * WhatsApp and SMS Inbound providers implement this
   *
   * @param payload Raw request body
   * @param signature Signature from webhook header
   * @returns Whether the signature is valid
   */
  validateWebhook?(payload: string, signature: string): boolean;

  /**
   * Generate instructions for the user based on the verification method
   *
   * @param token The verification token
   * @param phone The phone number being verified
   * @returns User-friendly instructions string
   */
  getInstructions(token: string, phone?: string): string;

  /**
   * Check if this provider is properly configured and ready to use
   *
   * @returns Whether the provider is available
   */
  isConfigured(): boolean;
}
