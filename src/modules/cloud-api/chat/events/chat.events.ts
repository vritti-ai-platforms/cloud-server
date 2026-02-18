import type { MessageResponseDto } from '../messages/dto/entity/message-response.dto';

// ============================================================================
// Internal Event Constants (NestJS EventEmitter)
// ============================================================================

export const CHAT_EVENTS = {
  NEW_MESSAGE: 'chat.new_message',
  NEW_CONVERSATION: 'chat.new_conversation',
  CONVERSATION_UPDATED: 'chat.conversation_updated',
} as const;

// ============================================================================
// WebSocket Event Constants (Socket.IO client-facing)
// ============================================================================

export const WS_EVENTS = {
  MESSAGE_CREATED: 'message.created',
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_UPDATED: 'conversation.updated',
} as const;

// ============================================================================
// Event Payload Interfaces
// ============================================================================

export interface NewMessageEvent {
  tenantId: string;
  conversationId: string;
  message: MessageResponseDto;
}

export interface NewConversationEvent {
  tenantId: string;
  conversationId: string;
}

export interface ConversationUpdatedEvent {
  tenantId: string;
  conversationId: string;
  updates: Record<string, unknown>;
}

