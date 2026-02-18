import { ApiProperty } from '@nestjs/swagger';

export class CannedResponseResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the canned response',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Short code used to quickly insert this canned response',
    example: 'greeting',
  })
  shortCode: string;

  @ApiProperty({
    description: 'The full message content of the canned response',
    example: 'Hello! How can I help you today?',
  })
  content: string;

  @ApiProperty({
    description: 'Timestamp when the canned response was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Timestamp when the canned response was last updated',
    example: '2024-01-20T14:45:00.000Z',
  })
  updatedAt: string;

  constructor(partial: Partial<CannedResponseResponseDto>) {
    Object.assign(this, partial);
  }

  static from(entity: {
    id: string;
    shortCode: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
  }): CannedResponseResponseDto {
    return new CannedResponseResponseDto({
      id: entity.id,
      shortCode: entity.shortCode,
      content: entity.content,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    });
  }
}
