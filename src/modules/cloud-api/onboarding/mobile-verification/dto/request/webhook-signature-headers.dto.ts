import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class WebhookSignatureHeadersDto {
  @ApiPropertyOptional({ description: 'WhatsApp HMAC-SHA256 signature (format: sha256=<hash>)' })
  @IsOptional()
  @IsString()
  'x-hub-signature-256'?: string;

  @ApiPropertyOptional({ description: 'Twilio request signature' })
  @IsOptional()
  @IsString()
  'x-twilio-signature'?: string;
}
