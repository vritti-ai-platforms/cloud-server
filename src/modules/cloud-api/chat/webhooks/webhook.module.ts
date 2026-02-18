import { Module } from '@nestjs/common';
import { ChatModule } from '../chat.module';
import { WebhookController } from './controllers/webhook.controller';
import { WebhookHandlerService } from './services/webhook-handler.service';
import { TelegramAdapter } from './services/telegram.adapter';
import { WhatsAppAdapter } from './services/whatsapp.adapter';
import { InstagramAdapter } from './services/instagram.adapter';

@Module({
  imports: [ChatModule], // Import ChatModule to get access to exported repositories
  controllers: [WebhookController],
  providers: [WebhookHandlerService, TelegramAdapter, WhatsAppAdapter, InstagramAdapter],
})
export class WebhookModule {}
