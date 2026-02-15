import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Message } from '@/db/schema';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the message',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Identifier of the conversation this message belongs to',
    example: '660e8400-e29b-41d4-a716-446655440000',
  })
  conversationId: string;

  @ApiProperty({
    description: 'The message content',
    example: 'Hello, how can I help you today?',
  })
  content: string;

  @ApiProperty({
    description: 'Content type of the message',
    enum: ['text', 'image', 'file', 'audio', 'video'],
    example: 'text',
  })
  type: string;

  @ApiProperty({
    description: 'Whether this message was sent by the contact (customer)',
    example: true,
  })
  isFromContact: boolean;

  @ApiProperty({
    description: 'Display name of the message sender',
    example: 'John Doe',
  })
  senderName: string;

  @ApiProperty({
    description: 'Delivery status of the message',
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    example: 'sent',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Client-generated UUID for deduplication between optimistic updates and WebSocket events',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  echoId: string | null;

  @ApiProperty({
    description: 'Timestamp when the message was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  constructor(partial: Partial<MessageResponseDto>) {
    Object.assign(this, partial);
  }

  static from(entity: Message): MessageResponseDto {
    return new MessageResponseDto({
      id: entity.id,
      conversationId: entity.conversationId,
      content: entity.content,
      type: entity.contentType.toLowerCase(),
      isFromContact: entity.senderType === 'CONTACT',
      senderName: entity.senderName,
      status: entity.status.toLowerCase(),
      echoId: entity.echoId ?? null,
      createdAt: entity.createdAt.toISOString(),
    });
  }
}
