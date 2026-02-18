import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'The message content to send',
    example: 'Hello, how can I help you?',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({
    description: 'Content type of the message',
    enum: ['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO'],
    default: 'TEXT',
  })
  @IsOptional()
  @IsEnum(['TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO'])
  contentType?: string;

  @ApiPropertyOptional({
    description: 'Client-generated UUID for deduplication between optimistic updates and WebSocket events',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  echoId?: string;
}
