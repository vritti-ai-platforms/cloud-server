import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class ConversationFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter conversations by status',
    enum: ['OPEN', 'RESOLVED', 'PENDING', 'SNOOZED'],
    example: 'OPEN',
  })
  @IsOptional()
  @IsEnum(['OPEN', 'RESOLVED', 'PENDING', 'SNOOZED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Search conversations by last message content',
    example: 'order issue',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter conversations by messaging channel type',
    enum: ['TELEGRAM', 'INSTAGRAM', 'WHATSAPP'],
    example: 'TELEGRAM',
  })
  @IsOptional()
  @IsEnum(['TELEGRAM', 'INSTAGRAM', 'WHATSAPP'])
  channelType?: string;

  @ApiPropertyOptional({
    description: 'Filter conversations by inbox identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  inboxId?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
