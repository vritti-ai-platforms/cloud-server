import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsUUID, Length, Matches } from 'class-validator';

export class VerifyIdentityDto {
  @ApiProperty({
    description: '6-digit OTP code sent to current email/phone',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  otpCode: string;
}

export class SubmitNewEmailDto {
  @ApiProperty({
    description: 'Change request ID from step 2',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  changeRequestId: string;

  @ApiProperty({
    description: 'New email address',
    example: 'newemail@example.com',
  })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty()
  newEmail: string;
}

export class VerifyNewEmailDto {
  @ApiProperty({
    description: 'Change request ID from step 2',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  changeRequestId: string;

  @ApiProperty({
    description: '6-digit OTP code sent to new email',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  otpCode: string;
}

export class RevertEmailChangeDto {
  @ApiProperty({
    description: 'Revert token from email notification',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  revertToken: string;
}

export class SubmitNewPhoneDto {
  @ApiProperty({
    description: 'Change request ID from step 2',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  changeRequestId: string;

  @ApiProperty({
    description: 'New phone number',
    example: '9876543210',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{10,15}$/, { message: 'Please enter a valid phone number' })
  newPhone: string;

  @ApiProperty({
    description: 'Country code for new phone number',
    example: 'IN',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 5, { message: 'Country code must be 2-5 characters' })
  newPhoneCountry: string;
}

export class VerifyNewPhoneDto {
  @ApiProperty({
    description: 'Change request ID from step 2',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  changeRequestId: string;

  @ApiProperty({
    description: '6-digit OTP code sent to new phone',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Verification code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Verification code must contain only numbers' })
  otpCode: string;
}

export class RevertPhoneChangeDto {
  @ApiProperty({
    description: 'Revert token from notification',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  revertToken: string;
}
