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
  @IsString()
  @IsNotEmpty()
  From: string;

  /**
   * The phone number that received the message (E.164 format)
   * Example: "+15559876543"
   */
  @IsString()
  @IsNotEmpty()
  To: string;

  /**
   * The body/content of the SMS message
   */
  @IsString()
  @IsNotEmpty()
  Body: string;

  /**
   * Twilio's unique identifier for the message
   * Example: "SM123..."
   */
  @IsString()
  @IsNotEmpty()
  MessageSid: string;

  /**
   * Twilio Account SID
   * Example: "AC..."
   */
  @IsString()
  @IsNotEmpty()
  AccountSid: string;

  /**
   * The number of segments in the message (for long messages)
   */
  @IsString()
  @IsOptional()
  NumSegments?: string;

  /**
   * The API version used
   */
  @IsString()
  @IsOptional()
  ApiVersion?: string;

  /**
   * Status of the message
   */
  @IsString()
  @IsOptional()
  SmsStatus?: string;

  /**
   * Unique identifier for the SMS
   */
  @IsString()
  @IsOptional()
  SmsSid?: string;

  /**
   * Messaging Service SID (if using a Messaging Service)
   */
  @IsString()
  @IsOptional()
  MessagingServiceSid?: string;

  /**
   * Number of media items attached (for MMS)
   */
  @IsString()
  @IsOptional()
  NumMedia?: string;

  /**
   * City of the sender (if available)
   */
  @IsString()
  @IsOptional()
  FromCity?: string;

  /**
   * State of the sender (if available)
   */
  @IsString()
  @IsOptional()
  FromState?: string;

  /**
   * Country of the sender (if available)
   */
  @IsString()
  @IsOptional()
  FromCountry?: string;

  /**
   * Zip code of the sender (if available)
   */
  @IsString()
  @IsOptional()
  FromZip?: string;

  /**
   * City of the recipient (if available)
   */
  @IsString()
  @IsOptional()
  ToCity?: string;

  /**
   * State of the recipient (if available)
   */
  @IsString()
  @IsOptional()
  ToState?: string;

  /**
   * Country of the recipient (if available)
   */
  @IsString()
  @IsOptional()
  ToCountry?: string;

  /**
   * Zip code of the recipient (if available)
   */
  @IsString()
  @IsOptional()
  ToZip?: string;
}
