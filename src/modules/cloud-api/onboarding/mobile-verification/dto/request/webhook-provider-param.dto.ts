import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export const WEBHOOK_PROVIDERS = ['whatsapp', 'sms'] as const;
export type WebhookProvider = (typeof WEBHOOK_PROVIDERS)[number];

export class WebhookProviderParamDto {
  @ApiProperty({
    description: 'Webhook provider type',
    example: 'whatsapp',
    enum: WEBHOOK_PROVIDERS,
  })
  @IsEnum(WEBHOOK_PROVIDERS, { message: 'Unsupported webhook provider. Supported: whatsapp, sms' })
  provider: WebhookProvider;
}
