import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({
    description:
      'User password that must be at least 8 characters and contain at least one lowercase letter, uppercase letter, number, and special character',
    example: 'SecureP@ss123',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, {
    message: 'Password must be at least 8 characters long',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message: 'Password must contain at least one lowercase letter, uppercase letter, number, and special character',
  })
  password: string;
}
