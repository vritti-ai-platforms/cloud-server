import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from '../tenant/tenant.module';
import { ChatController } from './controllers/chat.controller';
import { ChatRepository } from './repositories/chat.repository';
import { ChatService } from './services/chat.service';
import { ConversationService } from './services/conversation.service';

@Module({
  imports: [ConfigModule, TenantModule],
  controllers: [ChatController],
  providers: [ChatService, ConversationService, ChatRepository],
  exports: [ChatService, ConversationService],
})
export class AiChatModule {}
