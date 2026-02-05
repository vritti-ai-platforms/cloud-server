import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ForgotPasswordDto {
    @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
    })
    @IsEmail()
    email: string;
}

export class VerifyResetOtpDto {
    @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
    description: '6 digit OTP sent to the user email',
    example: '123456',
    })
    @IsString()
    @IsNotEmpty()
    otp: string;
}

export class ResetPasswordDto {
    @ApiProperty({
    description: 'Reset token received after OTP verification'
    })
    @IsString()
    @IsNotEmpty()
    resetToken: string;

    @ApiProperty({
    description: 'New password (min 8 chars, must include uppercase, lowercase, number, and special character)',
    example: 'NewPassword123!',
    minLength: 8,
    })
    @IsString()
    @MinLength(8,{ message: 'Password must be at least 8 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
      message: 'Password must contain at least one lowercase letter, uppercase letter, number, and special character',
    })
    newPassword: string;
}