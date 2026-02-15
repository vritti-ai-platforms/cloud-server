import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateConversationDto {
  @ApiPropertyOptional({
    description: 'New status for the conversation',
    enum: ['OPEN', 'RESOLVED', 'PENDING', 'SNOOZED'],
    example: 'RESOLVED',
  })
  @IsOptional()
  @IsEnum(['OPEN', 'RESOLVED', 'PENDING', 'SNOOZED'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Identifier of the agent to assign (null to unassign)',
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  assignedAgentId?: string | null;

  @ApiPropertyOptional({
    description: 'Labels to attach to the conversation',
    type: [String],
    example: ['urgent', 'vip'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({
    description: 'Unread message count',
    example: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unreadCount?: number;
}
