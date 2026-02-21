import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class WebhookChallengeQueryDto {
  // WhatsApp challenge params
  @ApiPropertyOptional({ description: 'WhatsApp hub mode (must be "subscribe")' })
  @IsOptional()
  @IsString()
  'hub.mode'?: string;

  @ApiPropertyOptional({ description: 'WhatsApp challenge string to echo back' })
  @IsOptional()
  @IsString()
  'hub.challenge'?: string;

  @ApiPropertyOptional({ description: 'WhatsApp verify token to validate' })
  @IsOptional()
  @IsString()
  'hub.verify_token'?: string;

  // SMS challenge params
  @ApiPropertyOptional({ description: 'SMS verify token to validate' })
  @IsOptional()
  @IsString()
  verify_token?: string;

  @ApiPropertyOptional({ description: 'SMS challenge string to echo back' })
  @IsOptional()
  @IsString()
  challenge?: string;
}
