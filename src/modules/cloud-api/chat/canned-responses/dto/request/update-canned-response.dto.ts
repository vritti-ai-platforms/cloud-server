import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCannedResponseDto {
  @ApiPropertyOptional({
    description: 'Short code used to quickly insert this canned response',
    example: 'greeting',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortCode?: string;

  @ApiPropertyOptional({
    description: 'The full message content of the canned response',
    example: 'Hello! How can I help you today?',
  })
  @IsOptional()
  @IsString()
  content?: string;
}
