import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { type VerificationMethod, VerificationMethodValues } from '@/db/schema/enums';

/**
 * DTO for initiating mobile verification
 * User provides phone number and optional verification method
 */
export class InitiateMobileVerificationDto {
  /**
   * Phone number in E.164 format (with + prefix)
   * Example: +919876543210
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  /**
   * ISO country code (2 letters)
   * Example: IN, US, GB
   */
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(5)
  phoneCountry: string;

  /**
   * Verification method
   * Defaults to WHATSAPP_QR
   */
  @IsEnum(Object.values(VerificationMethodValues))
  @IsOptional()
  method?: VerificationMethod = VerificationMethodValues.WHATSAPP_QR;
}
