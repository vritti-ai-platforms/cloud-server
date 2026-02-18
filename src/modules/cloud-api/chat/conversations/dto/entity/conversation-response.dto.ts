import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ContactEmbedDto {
  @ApiProperty({
    description: 'Unique identifier of the contact',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Display name of the contact',
    example: 'John Doe',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'URL to the contact avatar image',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the contact',
    example: '+1234567890',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Username of the contact on the messaging platform',
    example: 'johndoe',
  })
  username?: string;
}

class MessagePreviewDto {
  @ApiProperty({
    description: 'Content of the last message',
    example: 'Hello, I need help with my order.',
  })
  content: string;

  @ApiProperty({
    description: 'Timestamp when the message was sent',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Whether the message was sent by the contact (true) or an agent (false)',
    example: true,
  })
  isFromContact: boolean;
}

export class ConversationResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the conversation',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Embedded contact information',
    type: ContactEmbedDto,
  })
  contact: ContactEmbedDto;

  @ApiProperty({
    description: 'Messaging channel type',
    enum: ['telegram', 'whatsapp', 'instagram'],
    example: 'telegram',
  })
  channelType: string;

  @ApiProperty({
    description: 'Identifier of the inbox this conversation belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  inboxId: string;

  @ApiProperty({
    description: 'Current status of the conversation',
    enum: ['open', 'resolved', 'pending', 'snoozed'],
    example: 'open',
  })
  status: string;

  @ApiProperty({
    description: 'Number of unread messages in the conversation',
    example: 3,
  })
  unreadCount: number;

  @ApiPropertyOptional({
    description: 'Preview of the last message in the conversation',
    type: MessagePreviewDto,
    nullable: true,
  })
  lastMessage: MessagePreviewDto | null;

  @ApiProperty({
    description: 'Timestamp when the conversation was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the conversation was last updated',
    example: '2024-01-20T14:45:00.000Z',
  })
  updatedAt: string;

  @ApiPropertyOptional({
    description: 'Identifier of the agent assigned to this conversation',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  assignedAgentId?: string;

  @ApiPropertyOptional({
    description: 'Labels attached to this conversation',
    type: [String],
    example: ['urgent', 'vip'],
  })
  labels?: string[];

  constructor(partial: Partial<ConversationResponseDto>) {
    Object.assign(this, partial);
  }

  static from(entity: {
    id: string;
    contact?: { id: string; name: string; avatarUrl?: string | null; phone?: string | null; username?: string | null } | null;
    inbox?: { channelType: string } | null;
    inboxId: string;
    status: string;
    unreadCount: number;
    lastMessageContent?: string | null;
    lastMessageAt?: Date | null;
    lastMessageIsFromContact?: boolean | null;
    createdAt: Date;
    updatedAt: Date;
    assignedAgentId?: string | null;
    labels?: string[] | null;
  }): ConversationResponseDto {
    const contact = entity.contact;
    const inbox = entity.inbox;

    return new ConversationResponseDto({
      id: entity.id,
      contact: contact
        ? {
            id: contact.id,
            name: contact.name,
            avatarUrl: contact.avatarUrl ?? undefined,
            phone: contact.phone ?? undefined,
            username: contact.username ?? undefined,
          }
        : undefined,
      channelType: inbox ? inbox.channelType.toLowerCase() : undefined,
      inboxId: entity.inboxId,
      status: entity.status.toLowerCase(),
      unreadCount: entity.unreadCount,
      lastMessage: entity.lastMessageContent
        ? {
            content: entity.lastMessageContent,
            timestamp: entity.lastMessageAt?.toISOString() ?? entity.updatedAt.toISOString(),
            isFromContact: entity.lastMessageIsFromContact ?? false,
          }
        : null,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      assignedAgentId: entity.assignedAgentId ?? undefined,
      labels: entity.labels ?? undefined,
    });
  }
}
