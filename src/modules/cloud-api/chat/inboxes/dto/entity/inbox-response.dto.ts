import { ApiProperty } from '@nestjs/swagger';
import type { ChannelType, Inbox, InboxStatus } from '@/db/schema';

export class InboxResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the inbox',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Display name of the inbox',
    example: 'My Telegram Bot',
  })
  name: string;

  @ApiProperty({
    description: 'Messaging channel type',
    enum: ['TELEGRAM', 'INSTAGRAM', 'WHATSAPP'],
    example: 'TELEGRAM',
  })
  channelType: ChannelType;

  @ApiProperty({
    description: 'Current connection status of the inbox',
    enum: ['ACTIVE', 'PENDING', 'DISCONNECTED', 'ERROR'],
    example: 'ACTIVE',
  })
  status: InboxStatus;

  @ApiProperty({
    description: 'Channel-specific configuration (tokens, IDs, etc.)',
    example: { botToken: '123456789:ABCdefGhIJKlmnoPQRstUVwxyZ' },
  })
  channelConfig: Record<string, unknown>;

  @ApiProperty({
    description: 'Timestamp when the inbox was created',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the inbox was last updated',
    example: '2024-01-20T14:45:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  updatedAt: Date;

  constructor(partial: Partial<InboxResponseDto>) {
    Object.assign(this, partial);
  }

  static from(entity: Inbox): InboxResponseDto {
    return new InboxResponseDto({
      id: entity.id,
      name: entity.name,
      channelType: entity.channelType,
      status: entity.status,
      channelConfig: entity.channelConfig as Record<string, unknown>,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
