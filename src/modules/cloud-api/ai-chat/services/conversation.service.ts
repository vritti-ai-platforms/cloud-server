import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException } from '@vritti/api-sdk';
import type { ChatConversation } from '@/db/schema';
import {
  ConversationResponseDto,
  ConversationWithMessagesResponseDto,
  MessageResponseDto,
} from '../dto/conversation.dto';
import { ChatRepository } from '../repositories/chat.repository';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(private readonly chatRepository: ChatRepository) {}

  async listConversations(userId: string): Promise<ConversationResponseDto[]> {
    this.logger.log(`Listing conversations for user: ${userId}`);
    const conversations = await this.chatRepository.findConversationsByUserId(userId);
    return conversations.map(ConversationResponseDto.from);
  }

  async createConversation(userId: string, title?: string): Promise<ConversationResponseDto> {
    this.logger.log(`Creating conversation for user: ${userId}`);
    const conversation = await this.chatRepository.createConversation({
      userId,
      title: title || null,
      messageCount: 0,
    });
    return ConversationResponseDto.from(conversation);
  }

  async getConversation(conversationId: string, userId: string): Promise<ChatConversation> {
    const conversation = await this.chatRepository.findConversationByIdAndUserId(
      conversationId,
      userId,
    );

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID '${conversationId}' not found`,
        'The conversation you are looking for does not exist or you do not have access to it.',
      );
    }

    return conversation;
  }

  async getConversationWithMessages(
    conversationId: string,
    userId: string,
  ): Promise<ConversationWithMessagesResponseDto> {
    const conversation = await this.chatRepository.findConversationWithMessages(
      conversationId,
      userId,
    );

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID '${conversationId}' not found`,
        'The conversation you are looking for does not exist or you do not have access to it.',
      );
    }

    return ConversationWithMessagesResponseDto.fromWithMessages(conversation);
  }

  async getMessages(conversationId: string, userId: string): Promise<MessageResponseDto[]> {
    // Verify ownership
    await this.getConversation(conversationId, userId);
    const messages = await this.chatRepository.getMessagesByConversationId(conversationId);
    return messages.map(MessageResponseDto.from);
  }

  async updateTitle(
    conversationId: string,
    userId: string,
    title: string,
  ): Promise<ConversationResponseDto> {
    await this.getConversation(conversationId, userId);
    const updated = await this.chatRepository.updateConversationTitle(conversationId, title);
    return ConversationResponseDto.from(updated);
  }

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    await this.getConversation(conversationId, userId);
    await this.chatRepository.deleteConversation(conversationId);
    this.logger.log(`Deleted conversation: ${conversationId}`);
  }
}
