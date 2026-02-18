import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tenant, type TenantInfo } from '@vritti/api-sdk';
import {
  ApiCreateTelegramInbox,
  ApiCreateInstagramInbox,
  ApiCreateWhatsAppInbox,
  ApiListInboxes,
  ApiGetInbox,
  ApiDeleteInbox,
} from '../docs/inbox.docs';
import { CreateTelegramInboxDto } from '../dto/request/create-telegram-inbox.dto';
import { CreateInstagramInboxDto } from '../dto/request/create-instagram-inbox.dto';
import { CreateWhatsAppInboxDto } from '../dto/request/create-whatsapp-inbox.dto';
import type { InboxResponseDto } from '../dto/entity/inbox-response.dto';
import { InboxService } from '../services/inbox.service';

@ApiTags('Inboxes')
@ApiBearerAuth()
@Controller('inboxes')
export class InboxController {
  private readonly logger = new Logger(InboxController.name);

  constructor(private readonly inboxService: InboxService) {}

  // Creates a new Telegram inbox for the tenant
  @Post('telegram')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateTelegramInbox()
  async createTelegram(
    @Tenant() tenant: TenantInfo,
    @Body() dto: CreateTelegramInboxDto,
  ): Promise<{ inbox: InboxResponseDto; message: string }> {
    this.logger.log(`POST /inboxes/telegram - Creating Telegram inbox for tenant ${tenant.id}`);
    return this.inboxService.createTelegramInbox(tenant.id, dto);
  }

  // Creates a new Instagram inbox for the tenant
  @Post('instagram')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateInstagramInbox()
  async createInstagram(
    @Tenant() tenant: TenantInfo,
    @Body() dto: CreateInstagramInboxDto,
  ): Promise<{ inbox: InboxResponseDto; message: string }> {
    this.logger.log(`POST /inboxes/instagram - Creating Instagram inbox for tenant ${tenant.id}`);
    return this.inboxService.createInstagramInbox(tenant.id, dto);
  }

  // Creates a new WhatsApp inbox for the tenant
  @Post('whatsapp')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateWhatsAppInbox()
  async createWhatsApp(
    @Tenant() tenant: TenantInfo,
    @Body() dto: CreateWhatsAppInboxDto,
  ): Promise<{ inbox: InboxResponseDto; message: string }> {
    this.logger.log(`POST /inboxes/whatsapp - Creating WhatsApp inbox for tenant ${tenant.id}`);
    return this.inboxService.createWhatsAppInbox(tenant.id, dto);
  }

  // Lists all inboxes for the tenant with pagination
  @Get()
  @ApiListInboxes()
  async findAll(
    @Tenant() tenant: TenantInfo,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<{ inboxes: InboxResponseDto[]; total: number; page: number; limit: number }> {
    this.logger.log(`GET /inboxes - Listing inboxes for tenant ${tenant.id}`);
    return this.inboxService.findAll(tenant.id, page, limit);
  }

  // Retrieves a single inbox by ID
  @Get(':id')
  @ApiGetInbox()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantInfo,
  ): Promise<InboxResponseDto> {
    this.logger.log(`GET /inboxes/${id} - Fetching inbox for tenant ${tenant.id}`);
    return this.inboxService.findById(id, tenant.id);
  }

  // Deletes an inbox by ID
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteInbox()
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantInfo,
  ): Promise<void> {
    this.logger.log(`DELETE /inboxes/${id} - Deleting inbox for tenant ${tenant.id}`);
    return this.inboxService.delete(id, tenant.id);
  }
}
