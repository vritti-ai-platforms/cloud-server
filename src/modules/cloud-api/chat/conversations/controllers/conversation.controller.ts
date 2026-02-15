import { Controller, Get, Logger, Param, ParseUUIDPipe, Patch, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tenant, type TenantInfo } from '@vritti/api-sdk';
import {
  ApiGetConversation,
  ApiGetConversationCounts,
  ApiListConversations,
  ApiUpdateConversation,
} from '../docs/conversation.docs';
import type { ConversationResponseDto } from '../dto/entity/conversation-response.dto';
import { ConversationFiltersDto } from '../dto/request/conversation-filters.dto';
import { UpdateConversationDto } from '../dto/request/update-conversation.dto';
import { ConversationService } from '../services/conversation.service';
import type { ConversationStatusCounts } from '../repositories/conversation.repository';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(private readonly conversationService: ConversationService) {}

  // Retrieves a paginated list of conversations with optional filters
  @Get()
  @ApiListConversations()
  async findAll(
    @Tenant() tenant: TenantInfo,
    @Query() filters: ConversationFiltersDto,
  ): Promise<{ conversations: ConversationResponseDto[]; total: number; page: number; limit: number }> {
    this.logger.log(`GET /conversations - Tenant: ${tenant.id}`);
    return this.conversationService.findAll(tenant.id, filters);
  }

  // Returns conversation counts grouped by status
  @Get('counts')
  @ApiGetConversationCounts()
  async getCounts(@Tenant() tenant: TenantInfo): Promise<ConversationStatusCounts> {
    this.logger.log(`GET /conversations/counts - Tenant: ${tenant.id}`);
    return this.conversationService.getCounts(tenant.id);
  }

  // Retrieves a single conversation with embedded contact
  @Get(':id')
  @ApiGetConversation()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantInfo,
  ): Promise<ConversationResponseDto> {
    this.logger.log(`GET /conversations/${id} - Tenant: ${tenant.id}`);
    return this.conversationService.findById(id, tenant.id);
  }

  // Updates a conversation's status, assignment, labels, or unread count
  @Patch(':id')
  @ApiUpdateConversation()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantInfo,
    @Body() dto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    this.logger.log(`PATCH /conversations/${id} - Tenant: ${tenant.id}`);
    return this.conversationService.update(id, tenant.id, dto);
  }
}
