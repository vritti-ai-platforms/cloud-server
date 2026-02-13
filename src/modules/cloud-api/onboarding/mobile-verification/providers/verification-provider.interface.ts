import { type VerificationMethod } from '@/db/schema/enums';

export interface SendVerificationResult {
  messageId?: string;
  success: boolean;
  error?: string;
}

export interface VerificationProvider {
  readonly method: VerificationMethod;

  sendVerification(phone: string, phoneCountry: string, token: string): Promise<SendVerificationResult>;

  validateWebhook?(payload: string, signature: string): boolean;

  getInstructions(token: string, phone?: string): string;

  isConfigured(): boolean;
}
