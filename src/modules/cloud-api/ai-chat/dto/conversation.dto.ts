import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { ChatConversation, ChatMessage, ChatMessageRole } from '@/db/schema';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Optional title for the conversation',
    example: 'Tenant Management Questions',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;
}

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Unique conversation identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID who owns this conversation',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Conversation title',
    example: 'Tenant Management',
    nullable: true,
  })
  title: string | null;

  @ApiProperty({
    description: 'Number of messages in the conversation',
    example: 5,
  })
  messageCount: number;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-20T14:45:00.000Z',
  })
  updatedAt: Date;

  constructor(partial: Partial<ConversationResponseDto>) {
    Object.assign(this, partial);
  }

  static from(conversation: ChatConversation): ConversationResponseDto {
    return new ConversationResponseDto({
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      messageCount: conversation.messageCount,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
  }
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID' })
  id: string;

  @ApiProperty({ description: 'Conversation ID' })
  conversationId: string;

  @ApiProperty({
    description: 'Message role',
    enum: ['user', 'assistant', 'tool'],
  })
  role: ChatMessageRole;

  @ApiPropertyOptional({ description: 'Message content', nullable: true })
  content: string | null;

  @ApiPropertyOptional({ description: 'Tool calls made by assistant', nullable: true })
  toolCalls: unknown;

  @ApiPropertyOptional({ description: 'Tool call ID for tool results', nullable: true })
  toolCallId: string | null;

  @ApiPropertyOptional({ description: 'Tool name', nullable: true })
  toolName: string | null;

  @ApiPropertyOptional({ description: 'Tool execution result', nullable: true })
  toolResult: unknown;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  constructor(partial: Partial<MessageResponseDto>) {
    Object.assign(this, partial);
  }

  static from(message: ChatMessage): MessageResponseDto {
    return new MessageResponseDto({
      id: message.id,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      toolCalls: message.toolCalls,
      toolCallId: message.toolCallId,
      toolName: message.toolName,
      toolResult: message.toolResult,
      createdAt: message.createdAt,
    });
  }
}

export class ConversationWithMessagesResponseDto extends ConversationResponseDto {
  @ApiProperty({
    description: 'Messages in the conversation',
    type: [MessageResponseDto],
  })
  messages: MessageResponseDto[];

  static fromWithMessages(
    conversation: ChatConversation & { messages: ChatMessage[] },
  ): ConversationWithMessagesResponseDto {
    const dto = new ConversationWithMessagesResponseDto({
      id: conversation.id,
      userId: conversation.userId,
      title: conversation.title,
      messageCount: conversation.messageCount,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    });
    dto.messages = conversation.messages.map(MessageResponseDto.from);
    return dto;
  }
}
