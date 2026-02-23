import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { type FrontendVerificationMethod } from '../../utils/method-mapping.util';

export class InitiateMobileVerificationDto {
  @ApiProperty({
    description: 'Phone number in E.164 format (with + prefix).',
    example: '+919876543210',
    minLength: 10,
    maxLength: 20,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-2 country code for the phone number',
    example: 'IN',
    minLength: 2,
    maxLength: 5,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  phoneCountry: string;

  @ApiProperty({
    description: 'Method to use for mobile verification.',
    example: 'whatsapp',
    enum: ['whatsapp', 'sms', 'manual'],
  })
  @IsEnum(['whatsapp', 'sms', 'manual'])
  method: FrontendVerificationMethod;
}
