import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'The message content to send to the AI assistant',
    example: 'List all active tenants in the system',
    minLength: 1,
    maxLength: 10000,
  })
  @IsString({ message: 'Message must be a string' })
  @IsNotEmpty({ message: 'Message cannot be empty' })
  @MinLength(1, { message: 'Message cannot be empty' })
  @MaxLength(10000, { message: 'Message cannot exceed 10,000 characters' })
  message: string;
}
