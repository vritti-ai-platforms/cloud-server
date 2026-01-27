import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';

/**
 * DTO for initiating mobile verification
 *
 * For WHATSAPP_QR and SMS_QR methods: phone is optional (comes from webhook)
 * For MANUAL_OTP method: phone is required (OTP sent to phone)
 */
export class InitiateMobileVerificationDto {
  /**
   * Phone number in E.164 format (with + prefix)
   * Example: +919876543210
   *
   * Optional for QR-based methods (WHATSAPP_QR, SMS_QR) - phone comes from webhook
   * Required for OTP-based method (MANUAL_OTP)
   */
  @ApiPropertyOptional({
    description:
      'Phone number in E.164 format (with + prefix). Optional for QR-based methods, required for OTP-based method.',
    example: '+919876543210',
    minLength: 10,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone?: string;

  /**
   * ISO country code (2 letters)
   * Example: IN, US, GB
   *
   * Optional for QR-based methods
   */
  @ApiPropertyOptional({
    description: 'ISO 3166-1 alpha-2 country code for the phone number',
    example: 'IN',
    minLength: 2,
    maxLength: 5,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  phoneCountry?: string;

  /**
   * Verification method
   * Defaults to WHATSAPP_QR
   */
  @ApiPropertyOptional({
    description: 'Method to use for mobile verification. Defaults to WHATSAPP_QR.',
    example: 'WHATSAPP_QR',
    enum: Object.values(VerificationMethodValues),
    default: VerificationMethodValues.WHATSAPP_QR,
  })
  @IsEnum(Object.values(VerificationMethodValues))
  @IsOptional()
  method?: VerificationMethod = VerificationMethodValues.WHATSAPP_QR;
}
