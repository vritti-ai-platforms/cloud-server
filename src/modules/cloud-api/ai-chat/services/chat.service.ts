import { anthropic } from '@ai-sdk/anthropic';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { type ModelMessage, stepCountIs, streamText } from 'ai';
import { ChatMessageRoleValues, type NewChatMessage } from '@/db/schema';
import { TenantService } from '../../tenant/tenant.service';
import { ChatRepository } from '../repositories/chat.repository';
import { createAllTools } from '../tools';
import type { ChatStreamEvent } from '../types/chat.types';
import { ConversationService } from './conversation.service';

const SYSTEM_PROMPT = `You are an intelligent AI assistant for the Vritti cloud platform. You help users manage their tenants, companies, and business units through natural conversation.

## Your Capabilities
- List and view tenant information
- List and view company details
- List and view business units within companies
- Create new companies and business units
- Answer questions about the platform

## Guidelines
1. When asked about tenants, companies, or business units, USE THE PROVIDED TOOLS to fetch real data
2. Be concise and helpful in your responses
3. If you cannot find information, clearly state that
4. Format data in a readable way when presenting lists
5. Ask clarifying questions if the user's request is ambiguous

## Entity Creation Workflow
When creating entities (companies, business units), ALWAYS follow this workflow:
1. First call the preview tool (preview_create_company or preview_create_business_unit)
2. Present the preview details to the user in a clear format
3. Ask for explicit confirmation before proceeding
4. Only after user confirms, call the confirm tool (confirm_create_company or confirm_create_business_unit)
5. Report the created entity with its ID

**NEVER create entities without user confirmation.** The preview tools are designed to validate inputs and show what will be created.

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
    // Initialize Anthropic Claude model
    this.model = anthropic('claude-sonnet-4-20250514');

    // Initialize all tools with dependencies
    this.tools = createAllTools({
      tenantService: this.tenantService,
      db: this.db,
    });
  }

  async *sendMessage(conversationId: string, userId: string, userMessage: string): AsyncGenerator<ChatStreamEvent> {
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

    // Collect all tool result IDs to validate tool calls have matching results
    const toolResultIds = new Set(
      existingMessages.filter((m) => m.role === 'tool' && m.toolCallId).map((m) => m.toolCallId),
    );

    // Convert to AI SDK format, filtering out orphaned tool calls
    const messages: ModelMessage[] = existingMessages
      .filter((m) => m.id !== savedUserMessage.id)
      .map((m) => this.convertToAiMessage(m, toolResultIds))
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
        stopWhen: stepCountIs(5),
      });

      // Stream events to client in real-time
      for await (const event of result.fullStream) {
        switch (event.type) {
          case 'text-delta':
            yield { type: 'text-delta', content: event.text };
            break;

          case 'tool-call':
            yield {
              type: 'tool-call',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.input,
            };
            break;

          case 'tool-result':
            yield {
              type: 'tool-result',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              result: event.output,
            };
            break;

          case 'tool-error':
            this.logger.error(`Tool error for ${event.toolName}: ${event.error}`);
            yield {
              type: 'tool-error',
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              error: event.error instanceof Error ? event.error.message : String(event.error),
            };
            break;

          case 'error':
            this.logger.error(`Stream error: ${event.error}`);
            yield { type: 'error', message: String(event.error) };
            break;
        }
      }

      // After streaming completes, get the final aggregated data
      const steps = await result.steps;
      this.logger.debug(`Completed ${steps.length} steps`);

      // Save messages based on completed steps
      let lastMessageId = '';
      for (const step of steps) {
        // Save assistant message for this step (text and/or tool calls)
        const hasText = step.text && step.text.trim().length > 0;
        const hasToolCalls = step.toolCalls && step.toolCalls.length > 0;

        if (hasText || hasToolCalls) {
          const assistantMessage = await this.chatRepository.createMessage({
            conversationId,
            role: ChatMessageRoleValues.ASSISTANT,
            content: hasText ? step.text : null,
            toolCalls: hasToolCalls
              ? step.toolCalls.map((tc) => ({
                  toolCallId: tc.toolCallId,
                  toolName: tc.toolName,
                  input: tc.input,
                }))
              : null,
          });
          lastMessageId = assistantMessage.id;
          this.logger.debug(
            `Saved assistant message: ${assistantMessage.id}, text: ${hasText}, toolCalls: ${hasToolCalls}`,
          );
        }

        // Save tool results as separate TOOL messages
        if (step.toolResults && step.toolResults.length > 0) {
          await this.chatRepository.createMessages(
            step.toolResults.map((tr) => ({
              conversationId,
              role: ChatMessageRoleValues.TOOL,
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              toolResult: tr.output,
            })),
          );
          this.logger.debug(`Saved ${step.toolResults.length} tool result messages`);
        }

        // Save tool errors as TOOL messages (they're in step.content, not step.toolResults)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolErrors = step.content.filter((c: any) => c.type === 'tool-error') as Array<{
          type: 'tool-error';
          toolCallId: string;
          toolName: string;
          error: unknown;
        }>;
        if (toolErrors.length > 0) {
          await this.chatRepository.createMessages(
            toolErrors.map((te) => ({
              conversationId,
              role: ChatMessageRoleValues.TOOL,
              toolCallId: te.toolCallId,
              toolName: te.toolName,
              toolResult: {
                success: false,
                error: te.error instanceof Error ? te.error.message : String(te.error),
              },
            })),
          );
          this.logger.warn(`Saved ${toolErrors.length} tool error messages`);
        }
      }

      this.logger.log(`Completed processing for conversation ${conversationId}, ${steps.length} steps`);
      yield { type: 'done', messageId: lastMessageId || 'completed' };
    } catch (error) {
      this.logger.error(`Error processing message: ${error}`);
      yield {
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  private convertToAiMessage(
    message: {
      role: string;
      content: string | null;
      toolCalls: unknown;
      toolCallId: string | null;
      toolName: string | null;
      toolResult: unknown;
    },
    toolResultIds: Set<string | null>,
  ): ModelMessage | null {
    if (message.role === 'tool') {
      // Wrap the raw tool result in the proper ToolResultOutput format
      // The AI SDK schema expects output to be { type: 'text'|'json', value: ... }
      const rawResult = message.toolResult;
      const wrappedOutput =
        typeof rawResult === 'string'
          ? { type: 'text' as const, value: rawResult }
          : { type: 'json' as const, value: rawResult ?? null };

      return {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: message.toolCallId || '',
            toolName: message.toolName || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            output: wrappedOutput as any,
          },
        ],
      };
    }

    if (message.role === 'assistant') {
      const content: Array<
        { type: 'text'; text: string } | { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown }
      > = [];

      if (message.content) {
        content.push({ type: 'text', text: message.content });
      }

      if (message.toolCalls && Array.isArray(message.toolCalls)) {
        for (const tc of message.toolCalls as Array<{ toolCallId: string; toolName: string; input: unknown }>) {
          // Only include tool calls that have matching tool results
          // This prevents orphaned tool calls from breaking the AI SDK
          if (toolResultIds.has(tc.toolCallId)) {
            content.push({
              type: 'tool-call',
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              input: tc.input,
            });
          } else {
            this.logger.warn(`Skipping orphaned tool call ${tc.toolCallId} (${tc.toolName}) - no matching result`);
          }
        }
      }

      // Skip assistant messages with no content (from failed attempts)
      if (content.length === 0) {
        return null;
      }

      return { role: 'assistant', content };
    }

    if (message.role === 'user') {
      return { role: 'user', content: message.content || '' };
    }

    return null;
  }
}
