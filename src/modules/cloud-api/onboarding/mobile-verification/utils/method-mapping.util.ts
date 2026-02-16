import { VerificationChannelValues, type VerificationChannel } from '@/db/schema/enums';

// Frontend-friendly method names
export type FrontendVerificationMethod = 'whatsapp' | 'sms' | 'manual';

// Maps frontend method names to internal channel enum values
export function mapToInternalChannel(frontendMethod: FrontendVerificationMethod): VerificationChannel {
  switch (frontendMethod) {
    case 'whatsapp':
      return VerificationChannelValues.WHATSAPP_IN;
    case 'sms':
      return VerificationChannelValues.SMS_IN;
    case 'manual':
      return VerificationChannelValues.SMS_OUT;
  }
}

// Maps internal channel enum values to frontend-friendly names
export function mapToFrontendMethod(internalChannel: VerificationChannel): FrontendVerificationMethod {
  switch (internalChannel) {
    case VerificationChannelValues.WHATSAPP_IN:
      return 'whatsapp';
    case VerificationChannelValues.SMS_IN:
      return 'sms';
    case VerificationChannelValues.SMS_OUT:
      return 'manual';
    case VerificationChannelValues.EMAIL:
      return 'manual'; // Email uses same manual flow
    default:
      return 'whatsapp'; // Default fallback
  }
}
