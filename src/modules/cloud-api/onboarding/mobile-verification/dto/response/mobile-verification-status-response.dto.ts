import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MobileVerificationStatusResponseDto {
  @ApiProperty({
    description: 'Indicates whether the verification was initiated successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Human-readable message describing the verification status',
    example: 'Verification initiated successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Verification code for QR-based methods (WhatsApp/SMS). User sends this code to complete verification. Not returned for manual OTP method.',
    example: 'VRFY-A1B2C3',
  })
  verificationCode?: string;

  @ApiPropertyOptional({
    description: 'WhatsApp business number for generating QR code. Only returned for WhatsApp verification method.',
    example: '+14155238886',
  })
  whatsappNumber?: string;
}
