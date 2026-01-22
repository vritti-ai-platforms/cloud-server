import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * DTO for verifying mobile OTP
 * Used for SMS_OTP verification method where user enters the OTP received via SMS
 */
export class VerifyMobileOtpDto {
  /**
   * 6-digit OTP received via SMS
   */
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}
