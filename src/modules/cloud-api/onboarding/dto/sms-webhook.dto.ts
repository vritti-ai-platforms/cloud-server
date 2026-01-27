import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Twilio SMS Webhook Payload DTO
 * Reference: https://www.twilio.com/docs/messaging/guides/webhook-request
 *
 * This DTO represents the payload sent by Twilio when an inbound SMS is received.
 */
export class TwilioSmsWebhookDto {
  /**
   * The phone number that sent the message (E.164 format)
   * Example: "+15551234567"
   */
  @ApiProperty({
    description: 'Phone number that sent the message in E.164 format',
    example: '+15551234567',
  })
  @IsString()
  @IsNotEmpty()
  From: string;

  /**
   * The phone number that received the message (E.164 format)
   * Example: "+15559876543"
   */
  @ApiProperty({
    description: 'Phone number that received the message in E.164 format (your Twilio number)',
    example: '+15559876543',
  })
  @IsString()
  @IsNotEmpty()
  To: string;

  /**
   * The body/content of the SMS message
   */
  @ApiProperty({
    description: 'Body content of the SMS message',
    example: 'VRFY-A1B2C3',
  })
  @IsString()
  @IsNotEmpty()
  Body: string;

  /**
   * Twilio's unique identifier for the message
   * Example: "SM123..."
   */
  @ApiProperty({
    description: 'Twilio unique identifier for the message',
    example: 'SM1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  MessageSid: string;

  /**
   * Twilio Account SID
   * Example: "AC..."
   */
  @ApiProperty({
    description: 'Twilio Account SID',
    example: 'AC1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  AccountSid: string;

  /**
   * The number of segments in the message (for long messages)
   */
  @ApiPropertyOptional({
    description: 'Number of segments in the message for long messages',
    example: '1',
  })
  @IsString()
  @IsOptional()
  NumSegments?: string;

  /**
   * The API version used
   */
  @ApiPropertyOptional({
    description: 'Twilio API version used',
    example: '2010-04-01',
  })
  @IsString()
  @IsOptional()
  ApiVersion?: string;

  /**
   * Status of the message
   */
  @ApiPropertyOptional({
    description: 'Current status of the message',
    example: 'received',
  })
  @IsString()
  @IsOptional()
  SmsStatus?: string;

  /**
   * Unique identifier for the SMS
   */
  @ApiPropertyOptional({
    description: 'Unique identifier for the SMS (same as MessageSid)',
    example: 'SM1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsOptional()
  SmsSid?: string;

  /**
   * Messaging Service SID (if using a Messaging Service)
   */
  @ApiPropertyOptional({
    description: 'Messaging Service SID if using a Twilio Messaging Service',
    example: 'MG1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsOptional()
  MessagingServiceSid?: string;

  /**
   * Number of media items attached (for MMS)
   */
  @ApiPropertyOptional({
    description: 'Number of media items attached for MMS messages',
    example: '0',
  })
  @IsString()
  @IsOptional()
  NumMedia?: string;

  /**
   * City of the sender (if available)
   */
  @ApiPropertyOptional({
    description: 'City of the sender based on phone number lookup',
    example: 'San Francisco',
  })
  @IsString()
  @IsOptional()
  FromCity?: string;

  /**
   * State of the sender (if available)
   */
  @ApiPropertyOptional({
    description: 'State or province of the sender based on phone number lookup',
    example: 'CA',
  })
  @IsString()
  @IsOptional()
  FromState?: string;

  /**
   * Country of the sender (if available)
   */
  @ApiPropertyOptional({
    description: 'Country of the sender based on phone number lookup',
    example: 'US',
  })
  @IsString()
  @IsOptional()
  FromCountry?: string;

  /**
   * Zip code of the sender (if available)
   */
  @ApiPropertyOptional({
    description: 'Zip or postal code of the sender based on phone number lookup',
    example: '94105',
  })
  @IsString()
  @IsOptional()
  FromZip?: string;

  /**
   * City of the recipient (if available)
   */
  @ApiPropertyOptional({
    description: 'City of the recipient based on phone number lookup',
    example: 'New York',
  })
  @IsString()
  @IsOptional()
  ToCity?: string;

  /**
   * State of the recipient (if available)
   */
  @ApiPropertyOptional({
    description: 'State or province of the recipient based on phone number lookup',
    example: 'NY',
  })
  @IsString()
  @IsOptional()
  ToState?: string;

  /**
   * Country of the recipient (if available)
   */
  @ApiPropertyOptional({
    description: 'Country of the recipient based on phone number lookup',
    example: 'US',
  })
  @IsString()
  @IsOptional()
  ToCountry?: string;

  /**
   * Zip code of the recipient (if available)
   */
  @ApiPropertyOptional({
    description: 'Zip or postal code of the recipient based on phone number lookup',
    example: '10001',
  })
  @IsString()
  @IsOptional()
  ToZip?: string;
}
