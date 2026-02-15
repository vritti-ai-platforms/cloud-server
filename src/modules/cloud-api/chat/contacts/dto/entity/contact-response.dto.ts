import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactResponseDto {
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

  @ApiPropertyOptional({
    description: 'Email address of the contact',
    example: 'john@example.com',
  })
  email?: string;

  @ApiProperty({
    description: 'Timestamp when the contact was created',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: string;

  constructor(partial: Partial<ContactResponseDto>) {
    Object.assign(this, partial);
  }

  static from(entity: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    phone?: string | null;
    username?: string | null;
    email?: string | null;
    createdAt: Date;
  }): ContactResponseDto {
    return new ContactResponseDto({
      id: entity.id,
      name: entity.name,
      avatarUrl: entity.avatarUrl ?? undefined,
      phone: entity.phone ?? undefined,
      username: entity.username ?? undefined,
      email: entity.email ?? undefined,
      createdAt: entity.createdAt.toISOString(),
    });
  }
}
