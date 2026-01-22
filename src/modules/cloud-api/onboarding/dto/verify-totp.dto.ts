import { IsString, Length, Matches } from 'class-validator';

export class VerifyTotpDto {
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  token: string;
}
