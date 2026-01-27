import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { google } from '@ai-sdk/google';
import { streamText, type ModelMessage } from 'ai';
import { ChatMessageRoleValues, type NewChatMessage } from '@/db/schema';
import { TenantService } from '../../tenant/tenant.service';
import { ChatRepository } from '../repositories/chat.repository';
import { ConversationService } from './conversation.service';
import { createAllTools } from '../tools';
import type { ChatStreamEvent } from '../types/chat.types';

const SYSTEM_PROMPT = `You are an intelligent AI assistant for the Vritti cloud platform. You help users manage their tenants, companies, and business units through natural conversation.

## Your Capabilities
- List and view tenant information
- List and view company details
- List and view business units within companies
- Answer questions about the platform

## Guidelines
1. When asked about tenants, companies, or business units, USE THE PROVIDED TOOLS to fetch real data
2. Be concise and helpful in your responses
3. If you cannot find information, clearly state that
4. Format data in a readable way when presenting lists
5. Ask clarifying questions if the user's request is ambiguous

## Important
- Never make up data - always use tools to fetch real information
- Respect user permissions and data access boundaries
- Provide actionable insights when presenting data`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly model;
  private readonly tools;

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly conversationService: ConversationService,
    private readonly tenantService: TenantService,
    private readonly configService: ConfigService,
    private readonly db: PrimaryDatabaseService,
  ) {
    // Initialize Google Gemini model
    this.model = google('gemini-1.5-flash');

    // Initialize all tools with dependencies
    this.tools = createAllTools({
      tenantService: this.tenantService,
      db: this.db,
    });
  }

  async *sendMessage(
    conversationId: string,
    userId: string,
    userMessage: string,
  ): AsyncGenerator<ChatStreamEvent> {
    // Verify conversation ownership
    const conversation = await this.conversationService.getConversation(conversationId, userId);
    this.logger.log(`Processing message for conversation ${conversationId}`);

    // Save user message
    const savedUserMessage = await this.chatRepository.createMessage({
      conversationId,
      role: ChatMessageRoleValues.USER,
      content: userMessage,
    });

    // Get conversation history
    const existingMessages = await this.chatRepository.getMessagesByConversationId(conversationId);

    // Convert to AI SDK format
    const messages: ModelMessage[] = existingMessages
      .filter((m) => m.id !== savedUserMessage.id)
      .map((m) => this.convertToAiMessage(m))
      .filter((m): m is ModelMessage => m !== null);

    // Add new user message
    messages.push({ role: 'user', content: userMessage });

    // Auto-generate title from first message if not set
    if (!conversation.title && existingMessages.length === 0) {
      const title = userMessage.slice(0, 100) + (userMessage.length > 100 ? '...' : '');
      await this.conversationService.updateTitle(conversationId, userId, title);
    }

    try {
      const result = streamText({
        model: this.model,
        system: SYSTEM_PROMPT,
        messages,
        tools: this.tools,
      });

      let assistantContent = '';
      const toolCalls: Array<{ toolCallId: string; toolName: string; args: unknown }> = [];
      const toolResults: NewChatMessage[] = [];

      for await (const event of result.fullStream) {
        switch (event.type) {
          case 'text-delta':
            assistantContent += event.text;
            yield { type: 'text-delta', content: event.text };
            break;

          case 'tool-call':
            toolCalls.push({
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.input,
            });
            yield {
              type: 'tool-call',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.input,
            };
            break;

          case 'tool-result':
            toolResults.push({
              conversationId,
              role: ChatMessageRoleValues.TOOL,
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              toolResult: event.output,
            });
            yield {
              type: 'tool-result',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              result: event.output,
            };
            break;

          case 'error':
            this.logger.error(`Stream error: ${event.error}`);
            yield { type: 'error', message: String(event.error) };
            break;
        }
      }

      // Save assistant message
      const assistantMessage = await this.chatRepository.createMessage({
        conversationId,
        role: ChatMessageRoleValues.ASSISTANT,
        content: assistantContent || null,
        toolCalls: toolCalls.length > 0 ? toolCalls : null,
      });

      // Save tool results
      if (toolResults.length > 0) {
        await this.chatRepository.createMessages(toolResults);
      }

      this.logger.log(`Completed message ${assistantMessage.id}`);
      yield { type: 'done', messageId: assistantMessage.id };
    } catch (error) {
      this.logger.error(`Error processing message: ${error}`);
      yield {
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  private convertToAiMessage(message: {
    role: string;
    content: string | null;
    toolCalls: unknown;
    toolCallId: string | null;
    toolName: string | null;
    toolResult: unknown;
  }): ModelMessage | null {
    if (message.role === 'tool') {
      return {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: message.toolCallId || '',
            toolName: message.toolName || '',
            output: message.toolResult as any,
          },
        ],
      };
    }

    if (message.role === 'assistant') {
      const content: Array<{ type: 'text'; text: string } | { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }> = [];

      if (message.content) {
        content.push({ type: 'text', text: message.content });
      }

      if (message.toolCalls && Array.isArray(message.toolCalls)) {
        for (const tc of message.toolCalls as Array<{ toolCallId: string; toolName: string; input: unknown }>) {
          content.push({
            type: 'tool-call',
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            input: tc.input,
          });
        }
      }

      return { role: 'assistant', content };
    }

    if (message.role === 'user') {
      return { role: 'user', content: message.content || '' };
    }

    return null;
  }
}
