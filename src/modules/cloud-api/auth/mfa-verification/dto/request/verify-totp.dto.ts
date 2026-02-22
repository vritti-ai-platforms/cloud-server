import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Length, Matches } from 'class-validator';

export class VerifyMfaTotpDto {
  @ApiProperty({
    description: 'MFA session identifier obtained from the login challenge response',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @IsUUID()
  @IsString()
  @IsNotEmpty({ message: 'Session ID is required' })
  sessionId: string;

  @ApiProperty({
    description: 'Six-digit TOTP code from the authenticator app (e.g., Google Authenticator, Authy)',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    pattern: '^\\d{6}$',
  })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  code: string;
}
