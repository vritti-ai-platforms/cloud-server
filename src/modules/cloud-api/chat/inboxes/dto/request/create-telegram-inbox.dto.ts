import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTelegramInboxDto {
  @ApiPropertyOptional({
    description:
      'Display name for the Telegram inbox. If not provided, the bot name from the Telegram API will be used.',
    example: 'My Telegram Bot',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Telegram Bot API token obtained from @BotFather',
    example: '123456789:ABCdefGhIJKlmnoPQRstUVwxyZ',
  })
  @IsString()
  @IsNotEmpty()
  botToken: string;
}
