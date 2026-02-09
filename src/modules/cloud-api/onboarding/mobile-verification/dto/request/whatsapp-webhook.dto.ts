import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class WhatsAppProfileDto {
  @ApiProperty({
    description: 'Display name of the WhatsApp user as set in their profile',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

export class WhatsAppContactDto {
  @ApiProperty({
    description: 'Profile information of the WhatsApp contact',
    type: WhatsAppProfileDto,
  })
  @ValidateNested()
  @Type(() => WhatsAppProfileDto)
  profile: WhatsAppProfileDto;

  @ApiProperty({
    description: 'WhatsApp ID of the contact, which is the phone number without + prefix',
    example: '919876543210',
  })
  @IsString()
  @IsNotEmpty()
  wa_id: string;
}

export class WhatsAppTextDto {
  @ApiProperty({
    description: 'Text content of the WhatsApp message',
    example: 'VRFY-A1B2C3',
  })
  @IsString()
  @IsNotEmpty()
  body: string;
}

export class WhatsAppMessageDto {
  @ApiProperty({
    description: 'Phone number of the sender in E.164 format without the + prefix',
    example: '919876543210',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    description: 'Unique identifier for the WhatsApp message',
    example: 'wamid.HBgLMTIzNDU2Nzg5MBUCABIYIDA2Q0E0NkYxMkYx',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Unix timestamp when the message was sent',
    example: '1704067200',
  })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiProperty({
    description: 'Type of the message (text, image, document, etc.)',
    example: 'text',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    description: 'Text content object present when message type is text',
    type: WhatsAppTextDto,
  })
  @ValidateNested()
  @Type(() => WhatsAppTextDto)
  @IsOptional()
  text?: WhatsAppTextDto;
}

export class WhatsAppMetadataDto {
  @ApiProperty({
    description: 'Display phone number of the WhatsApp Business Account',
    example: '+14155238886',
  })
  @IsString()
  @IsNotEmpty()
  display_phone_number: string;

  @ApiProperty({
    description: 'Phone number ID of the WhatsApp Business Account',
    example: '123456789012345',
  })
  @IsString()
  @IsNotEmpty()
  phone_number_id: string;
}

export class WhatsAppValueDto {
  @ApiProperty({
    description: 'Messaging product identifier, always whatsapp for WhatsApp webhooks',
    example: 'whatsapp',
  })
  @IsString()
  @IsNotEmpty()
  messaging_product: string;

  @ApiProperty({
    description: 'Metadata about the WhatsApp Business Account receiving the message',
    type: WhatsAppMetadataDto,
  })
  @ValidateNested()
  @Type(() => WhatsAppMetadataDto)
  metadata: WhatsAppMetadataDto;

  @ApiPropertyOptional({
    description: 'Array of contact information for message senders',
    type: [WhatsAppContactDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppContactDto)
  @IsOptional()
  contacts?: WhatsAppContactDto[];

  @ApiPropertyOptional({
    description: 'Array of messages received in this webhook event',
    type: [WhatsAppMessageDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppMessageDto)
  @IsOptional()
  messages?: WhatsAppMessageDto[];
}

export class WhatsAppChangeDto {
  @ApiProperty({
    description: 'Value object containing the webhook event data',
    type: WhatsAppValueDto,
  })
  @ValidateNested()
  @Type(() => WhatsAppValueDto)
  value: WhatsAppValueDto;

  @ApiProperty({
    description: 'Field that triggered this webhook, typically messages',
    example: 'messages',
  })
  @IsString()
  @IsNotEmpty()
  field: string;
}

export class WhatsAppEntryDto {
  @ApiProperty({
    description: 'WhatsApp Business Account ID',
    example: '123456789012345',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Array of changes/events in this webhook entry',
    type: [WhatsAppChangeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppChangeDto)
  changes: WhatsAppChangeDto[];
}

export class WhatsAppWebhookDto {
  @ApiProperty({
    description: 'Object type, always whatsapp_business_account for WhatsApp webhooks',
    example: 'whatsapp_business_account',
  })
  @IsString()
  @IsNotEmpty()
  object: string;

  @ApiProperty({
    description: 'Array of webhook entries, each representing an event from a WhatsApp Business Account',
    type: [WhatsAppEntryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WhatsAppEntryDto)
  entry: WhatsAppEntryDto[];
}
