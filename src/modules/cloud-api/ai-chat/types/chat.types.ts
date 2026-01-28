import type { ModelMessage } from 'ai';

// SSE Event types for streaming responses
export type ChatStreamEvent =
  | { type: 'text-delta'; content: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool-result'; toolCallId: string; toolName: string; result: unknown }
  | { type: 'tool-error'; toolCallId: string; toolName: string; error: string }
  | { type: 'error'; message: string }
  | { type: 'done'; messageId: string };

// Tool context passed to tool execution
export interface ToolContext {
  userId: string;
  conversationId: string;
}

// Conversation history format for AI
export type ConversationHistory = ModelMessage[];
