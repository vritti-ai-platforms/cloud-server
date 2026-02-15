import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CHAT_EVENTS,
  WS_EVENTS,
  type ConversationUpdatedEvent,
  type NewConversationEvent,
  type NewMessageEvent,
} from '../chat.events';
import { ChatGateway } from '../gateways/chat.gateway';

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class ChatEventListenerService {
  private readonly logger = new Logger(ChatEventListenerService.name);

  constructor(private readonly chatGateway: ChatGateway) {}

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  @OnEvent(CHAT_EVENTS.NEW_MESSAGE)
  handleNewMessage(payload: NewMessageEvent): void {
    this.logger.log(
      `Handling ${CHAT_EVENTS.NEW_MESSAGE} for conversation ${payload.conversationId}`,
    );

    this.chatGateway.sendToTenant(payload.tenantId, WS_EVENTS.MESSAGE_CREATED, payload);
  }

  @OnEvent(CHAT_EVENTS.NEW_CONVERSATION)
  handleNewConversation(payload: NewConversationEvent): void {
    this.logger.log(
      `Handling ${CHAT_EVENTS.NEW_CONVERSATION} for conversation ${payload.conversationId}`,
    );

    this.chatGateway.sendToTenant(payload.tenantId, WS_EVENTS.CONVERSATION_CREATED, payload);
  }

  @OnEvent(CHAT_EVENTS.CONVERSATION_UPDATED)
  handleConversationUpdated(payload: ConversationUpdatedEvent): void {
    this.logger.log(
      `Handling ${CHAT_EVENTS.CONVERSATION_UPDATED} for conversation ${payload.conversationId}`,
    );

    this.chatGateway.sendToTenant(payload.tenantId, WS_EVENTS.CONVERSATION_UPDATED, payload);
  }
}
