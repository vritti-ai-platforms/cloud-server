import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';

export class MobileVerificationStatusResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the verification session',
    example: 'ver_abc123def456',
  })
  verificationId: string;

  @ApiProperty({
    description: 'The verification method being used for mobile verification',
    example: 'WHATSAPP_QR',
    enum: Object.values(VerificationMethodValues),
  })
  method: VerificationMethod;

  @ApiPropertyOptional({
    description: 'Verification token that the user should send via WhatsApp or SMS to complete verification',
    example: 'VRFY-A1B2C3',
  })
  verificationToken?: string;

  @ApiProperty({
    description: 'Indicates whether the mobile number has been successfully verified',
    example: false,
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Phone number being verified in E.164 format. May be null for QR methods until webhook receives it.',
    example: '+919876543210',
    nullable: true,
  })
  phone?: string | null;

  @ApiPropertyOptional({
    description: 'ISO country code for the phone number. May be null for QR methods.',
    example: 'IN',
    nullable: true,
  })
  phoneCountry?: string | null;

  @ApiProperty({
    description: 'Timestamp when the verification session expires',
    example: '2024-01-15T10:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Human-readable message describing the current verification status',
    example: 'Waiting for user to scan QR code and send verification token via WhatsApp',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Step-by-step instructions for the user to complete verification',
    example: 'Open WhatsApp, scan the QR code, and send the verification token to complete verification.',
  })
  instructions?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp business number that the frontend uses to generate the QR code universal link',
    example: '+14155238886',
  })
  whatsappNumber?: string;
}
