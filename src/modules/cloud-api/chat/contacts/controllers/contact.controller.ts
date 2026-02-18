import { Controller, Get, Logger, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Tenant, type TenantInfo } from '@vritti/api-sdk';
import { ApiGetContact, ApiGetContactConversations } from '../docs/contact.docs';
import type { ContactResponseDto } from '../dto/entity/contact-response.dto';
import type { ConversationResponseDto } from '../../conversations/dto/entity/conversation-response.dto';
import { ContactService } from '../services/contact.service';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);

  constructor(private readonly contactService: ContactService) {}

  // Retrieves a single contact by ID
  @Get(':id')
  @ApiGetContact()
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantInfo,
  ): Promise<ContactResponseDto> {
    this.logger.log(`GET /contacts/${id} - Tenant: ${tenant.id}`);
    return this.contactService.findById(id, tenant.id);
  }

  // Retrieves all conversations for a contact, optionally excluding one
  @Get(':id/conversations')
  @ApiGetContactConversations()
  async findConversations(
    @Param('id', ParseUUIDPipe) id: string,
    @Tenant() tenant: TenantInfo,
    @Query('exclude') exclude?: string,
  ): Promise<ConversationResponseDto[]> {
    this.logger.log(`GET /contacts/${id}/conversations - Tenant: ${tenant.id}`);
    return this.contactService.findConversations(id, tenant.id, exclude);
  }
}
