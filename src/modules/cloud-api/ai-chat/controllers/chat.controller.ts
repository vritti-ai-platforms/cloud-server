import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import type { FastifyReply } from 'fastify';
import { ChatService } from '../services/chat.service';
import { ConversationService } from '../services/conversation.service';
import { SendMessageDto } from '../dto/send-message.dto';
import {
  ConversationResponseDto,
  ConversationWithMessagesResponseDto,
  CreateConversationDto,
  MessageResponseDto,
} from '../dto/conversation.dto';
import type { ChatStreamEvent } from '../types/chat.types';

@ApiTags('AI Chat')
@ApiBearerAuth()
@Controller('ai-chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly conversationService: ConversationService,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List all conversations for the current user' })
  @ApiResponse({ status: 200, type: [ConversationResponseDto] })
  async listConversations(@UserId() userId: string): Promise<ConversationResponseDto[]> {
    this.logger.log(`GET /ai-chat/conversations - User: ${userId}`);
    return this.conversationService.listConversations(userId);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new conversation' })
  @ApiBody({ type: CreateConversationDto })
  @ApiResponse({ status: 201, type: ConversationResponseDto })
  async createConversation(
    @UserId() userId: string,
    @Body() dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    this.logger.log(`POST /ai-chat/conversations - User: ${userId}`);
    return this.conversationService.createConversation(userId, dto.title);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a conversation with all messages' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, type: ConversationWithMessagesResponseDto })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ): Promise<ConversationWithMessagesResponseDto> {
    this.logger.log(`GET /ai-chat/conversations/${conversationId} - User: ${userId}`);
    return this.conversationService.getConversationWithMessages(conversationId, userId);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 204, description: 'Conversation deleted' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ): Promise<void> {
    this.logger.log(`DELETE /ai-chat/conversations/${conversationId} - User: ${userId}`);
    await this.conversationService.deleteConversation(conversationId, userId);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get all messages in a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({ status: 200, type: [MessageResponseDto] })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ): Promise<MessageResponseDto[]> {
    this.logger.log(`GET /ai-chat/conversations/${conversationId}/messages - User: ${userId}`);
    return this.conversationService.getMessages(conversationId, userId);
  }

  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a message and receive streaming AI response',
    description: `Sends a message to the AI assistant and receives a streaming response via SSE.

**Event Types:**
- \`text-delta\`: Incremental text from AI
- \`tool-call\`: AI is calling a tool
- \`tool-result\`: Tool execution result
- \`error\`: An error occurred
- \`done\`: Response complete`,
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiBody({ type: SendMessageDto })
  @ApiProduces('text/event-stream')
  @ApiResponse({ status: 200, description: 'Streaming response' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @UserId() userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() dto: SendMessageDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    this.logger.log(`POST /ai-chat/conversations/${conversationId}/messages - User: ${userId}`);

    // Access raw Node.js response for SSE streaming (Fastify uses reply.raw)
    const res = reply.raw;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const event of this.chatService.sendMessage(
        conversationId,
        userId,
        dto.message,
      )) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (error) {
      this.logger.error(`SSE Error: ${error}`);
      const errorEvent: ChatStreamEvent = {
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    } finally {
      res.end();
    }
  }
}
