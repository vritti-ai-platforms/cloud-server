import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@vritti/api-sdk';
import { MessageResponseDto } from '../dto/entity/message-response.dto';
import type { SendMessageDto } from '../dto/request/send-message.dto';
import { MessageRepository } from '../repositories/message.repository';
import { ConversationRepository } from '../../conversations/repositories/conversation.repository';

@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Retrieves a paginated list of messages for a conversation */
  async findByConversationId(
    conversationId: string,
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<{ messages: MessageResponseDto[]; total: number; page: number; limit: number }> {
    const conversation = await this.conversationRepository.findByIdAndTenantId(conversationId, tenantId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const { data, total } = await this.messageRepository.findByConversationId(conversationId, page, limit);

    return {
      messages: data.map(MessageResponseDto.from),
      total,
      page,
      limit,
    };
  }

  /** Sends an agent reply and updates the conversation accordingly */
  async sendMessage(
    conversationId: string,
    tenantId: string,
    userId: string,
    userName: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const conversation = await this.conversationRepository.findByIdAndTenantId(conversationId, tenantId);
    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    const message = await this.messageRepository.create({
      conversationId,
      content: dto.content,
      contentType: (dto.contentType ?? 'TEXT') as 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO',
      senderType: 'USER',
      senderId: userId,
      senderName: userName,
      status: 'SENT',
      isPrivate: false,
      echoId: dto.echoId,
    });

    // Update conversation denormalized fields and reopen if resolved/snoozed
    const conversationUpdate: Record<string, unknown> = {
      lastMessageContent: dto.content,
      lastMessageAt: message.createdAt,
      lastMessageIsFromContact: false,
      unreadCount: 0,
    };

    if (conversation.status === 'RESOLVED' || conversation.status === 'SNOOZED') {
      conversationUpdate.status = 'OPEN';
    }

    await this.conversationRepository.update(conversationId, conversationUpdate);

    const responseDto = MessageResponseDto.from(message);

    // Emit event for real-time UI updates via SSE
    this.eventEmitter.emit('chat.new_message', {
      tenantId,
      conversationId,
      message: responseDto,
    });

    this.logger.log(`Agent ${userId} sent message in conversation ${conversationId}`);

    return responseDto;
  }
}
