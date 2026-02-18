import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCannedResponseDto {
  @ApiProperty({
    description: 'Short code used to quickly insert this canned response',
    example: 'greeting',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  shortCode: string;

  @ApiProperty({
    description: 'The full message content of the canned response',
    example: 'Hello! How can I help you today?',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
