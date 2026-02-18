import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException } from '@vritti/api-sdk';
import { CHAT_EVENTS } from '../../events/chat.events';
import { ConversationResponseDto } from '../dto/entity/conversation-response.dto';
import type { ConversationFiltersDto } from '../dto/request/conversation-filters.dto';
import type { UpdateConversationDto } from '../dto/request/update-conversation.dto';
import { ConversationRepository, type ConversationStatusCounts } from '../repositories/conversation.repository';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Retrieves a paginated and filtered list of conversations for a tenant */
  async findAll(
    tenantId: string,
    filtersDto: ConversationFiltersDto,
  ): Promise<{ conversations: ConversationResponseDto[]; total: number; page: number; limit: number }> {
    const page = filtersDto.page ?? 1;
    const limit = filtersDto.limit ?? 20;

    const { data, total } = await this.conversationRepository.findAllFiltered(tenantId, {
      status: filtersDto.status as Parameters<typeof this.conversationRepository.findAllFiltered>[1]['status'],
      search: filtersDto.search,
      channelType: filtersDto.channelType as Parameters<typeof this.conversationRepository.findAllFiltered>[1]['channelType'],
      inboxId: filtersDto.inboxId,
      page,
      limit,
    });

    return {
      conversations: data.map(ConversationResponseDto.from),
      total,
      page,
      limit,
    };
  }

  /** Returns conversation counts grouped by status for a tenant */
  async getCounts(tenantId: string): Promise<ConversationStatusCounts> {
    return this.conversationRepository.countByStatus(tenantId);
  }

  /** Retrieves a single conversation by ID with embedded contact */
  async findById(id: string, tenantId: string): Promise<ConversationResponseDto> {
    const conversation = await this.conversationRepository.findByIdAndTenantId(id, tenantId);

    if (!conversation) {
      throw new NotFoundException('Conversation not found.');
    }

    return ConversationResponseDto.from(conversation);
  }

  /** Updates a conversation's mutable fields and returns the updated result */
  async update(id: string, tenantId: string, dto: UpdateConversationDto): Promise<ConversationResponseDto> {
    const existing = await this.conversationRepository.findByIdAndTenantId(id, tenantId);

    if (!existing) {
      throw new NotFoundException('Conversation not found.');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.assignedAgentId !== undefined) updateData.assignedAgentId = dto.assignedAgentId;
    if (dto.labels !== undefined) updateData.labels = dto.labels;
    if (dto.unreadCount !== undefined) updateData.unreadCount = dto.unreadCount;

    await this.conversationRepository.update(id, updateData);

    // Re-fetch with relations to build the full response
    const updated = await this.conversationRepository.findByIdAndTenantId(id, tenantId);

    this.logger.log(`Updated conversation ${id} for tenant ${tenantId}`);

    // Emit event for SSE real-time updates
    this.eventEmitter.emit(CHAT_EVENTS.CONVERSATION_UPDATED, {
      tenantId,
      conversationId: id,
      updates: updateData,
    });

    return ConversationResponseDto.from(updated!);
  }
}
