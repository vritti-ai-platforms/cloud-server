import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TenantContextService } from '@vritti/api-sdk';
import { jwtConfigFactory } from '../../../config/jwt.config';
import { InboxRepository } from './inboxes/repositories/inbox.repository';
import { InboxController } from './inboxes/controllers/inbox.controller';
import { InboxService } from './inboxes/services/inbox.service';
import { InstagramOAuthController } from './inboxes/controllers/instagram-oauth.controller';
import { WhatsAppEmbeddedSignupController } from './inboxes/controllers/whatsapp-embedded-signup.controller';
import { InstagramOAuthService } from './inboxes/services/instagram-oauth.service';
import { WhatsAppEmbeddedSignupService } from './inboxes/services/whatsapp-embedded-signup.service';
import { ConversationRepository } from './conversations/repositories/conversation.repository';
import { ConversationController } from './conversations/controllers/conversation.controller';
import { ConversationService } from './conversations/services/conversation.service';
import { MessageRepository } from './messages/repositories/message.repository';
import { MessageController } from './messages/controllers/message.controller';
import { MessageService } from './messages/services/message.service';
import { ContactRepository } from './contacts/repositories/contact.repository';
import { ContactInboxRepository } from './contacts/repositories/contact-inbox.repository';
import { ContactController } from './contacts/controllers/contact.controller';
import { ContactService } from './contacts/services/contact.service';
import { CannedResponseRepository } from './canned-responses/repositories/canned-response.repository';
import { CannedResponseController } from './canned-responses/controllers/canned-response.controller';
import { CannedResponseService } from './canned-responses/services/canned-response.service';
import { ChatGateway } from './events/gateways/chat.gateway';
import { ChatEventListenerService } from './events/services/chat-event-listener.service';
import { OutboundDispatchService } from './events/services/outbound-dispatch.service';

const repositories = [
  InboxRepository,
  ConversationRepository,
  MessageRepository,
  ContactRepository,
  ContactInboxRepository,
  CannedResponseRepository,
];

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfigFactory,
    }),
  ],
  controllers: [
    InstagramOAuthController,
    WhatsAppEmbeddedSignupController,
    InboxController,
    ConversationController,
    MessageController,
    ContactController,
    CannedResponseController,
  ],
  providers: [
    TenantContextService,
    ...repositories,
    InboxService,
    InstagramOAuthService,
    WhatsAppEmbeddedSignupService,
    ConversationService,
    MessageService,
    ContactService,
    CannedResponseService,
    ChatGateway,
    ChatEventListenerService,
    OutboundDispatchService,
  ],
  exports: [...repositories, InstagramOAuthService],
})
export class ChatModule {}
