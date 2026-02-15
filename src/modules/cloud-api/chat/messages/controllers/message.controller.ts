import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tenant, type TenantInfo, UserId } from '@vritti/api-sdk';
import { ApiListMessages, ApiSendMessage } from '../docs/message.docs';
import type { MessageResponseDto } from '../dto/entity/message-response.dto';
import { SendMessageDto } from '../dto/request/send-message.dto';
import { MessageService } from '../services/message.service';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('conversations/:conversationId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  @ApiListMessages()
  async findAll(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Tenant() tenant: TenantInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<{ messages: MessageResponseDto[]; total: number; page: number; limit: number }> {
    return this.messageService.findByConversationId(conversationId, tenant.id, page, limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiSendMessage()
  async send(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Tenant() tenant: TenantInfo,
    @UserId() userId: string,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Placeholder name until user profile lookup is implemented
    const userName = 'Agent';
    return this.messageService.sendMessage(conversationId, tenant.id, userId, userName, dto);
  }
}
