import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TwilioSmsWebhookDto {
  @ApiProperty({
    description: 'Phone number that sent the message in E.164 format',
    example: '+15551234567',
  })
  @IsString()
  @IsNotEmpty()
  From: string;

  @ApiProperty({
    description: 'Phone number that received the message in E.164 format (your Twilio number)',
    example: '+15559876543',
  })
  @IsString()
  @IsNotEmpty()
  To: string;

  @ApiProperty({
    description: 'Body content of the SMS message',
    example: 'VRFY-A1B2C3',
  })
  @IsString()
  @IsNotEmpty()
  Body: string;

  @ApiProperty({
    description: 'Twilio unique identifier for the message',
    example: 'SM1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  MessageSid: string;

  @ApiProperty({
    description: 'Twilio Account SID',
    example: 'AC1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  AccountSid: string;

  @ApiPropertyOptional({
    description: 'Number of segments in the message for long messages',
    example: '1',
  })
  @IsString()
  @IsOptional()
  NumSegments?: string;

  @ApiPropertyOptional({
    description: 'Twilio API version used',
    example: '2010-04-01',
  })
  @IsString()
  @IsOptional()
  ApiVersion?: string;

  @ApiPropertyOptional({
    description: 'Current status of the message',
    example: 'received',
  })
  @IsString()
  @IsOptional()
  SmsStatus?: string;

  @ApiPropertyOptional({
    description: 'Unique identifier for the SMS (same as MessageSid)',
    example: 'SM1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsOptional()
  SmsSid?: string;

  @ApiPropertyOptional({
    description: 'Messaging Service SID if using a Twilio Messaging Service',
    example: 'MG1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsOptional()
  MessagingServiceSid?: string;

  @ApiPropertyOptional({
    description: 'Number of media items attached for MMS messages',
    example: '0',
  })
  @IsString()
  @IsOptional()
  NumMedia?: string;

  @ApiPropertyOptional({
    description: 'City of the sender based on phone number lookup',
    example: 'San Francisco',
  })
  @IsString()
  @IsOptional()
  FromCity?: string;

  @ApiPropertyOptional({
    description: 'State or province of the sender based on phone number lookup',
    example: 'CA',
  })
  @IsString()
  @IsOptional()
  FromState?: string;

  @ApiPropertyOptional({
    description: 'Country of the sender based on phone number lookup',
    example: 'US',
  })
  @IsString()
  @IsOptional()
  FromCountry?: string;

  @ApiPropertyOptional({
    description: 'Zip or postal code of the sender based on phone number lookup',
    example: '94105',
  })
  @IsString()
  @IsOptional()
  FromZip?: string;

  @ApiPropertyOptional({
    description: 'City of the recipient based on phone number lookup',
    example: 'New York',
  })
  @IsString()
  @IsOptional()
  ToCity?: string;

  @ApiPropertyOptional({
    description: 'State or province of the recipient based on phone number lookup',
    example: 'NY',
  })
  @IsString()
  @IsOptional()
  ToState?: string;

  @ApiPropertyOptional({
    description: 'Country of the recipient based on phone number lookup',
    example: 'US',
  })
  @IsString()
  @IsOptional()
  ToCountry?: string;

  @ApiPropertyOptional({
    description: 'Zip or postal code of the recipient based on phone number lookup',
    example: '10001',
  })
  @IsString()
  @IsOptional()
  ToZip?: string;
}
