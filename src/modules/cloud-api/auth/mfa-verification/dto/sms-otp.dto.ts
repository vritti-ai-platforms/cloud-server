import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class SendSmsOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;
}

export class VerifySmsOtpDto {
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;

  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  code: string;
}
