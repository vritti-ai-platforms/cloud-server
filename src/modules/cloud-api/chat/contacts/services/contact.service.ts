import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException } from '@vritti/api-sdk';
import { ContactResponseDto } from '../dto/entity/contact-response.dto';
import { ConversationResponseDto } from '../../conversations/dto/entity/conversation-response.dto';
import { ContactRepository } from '../repositories/contact.repository';
import { ConversationRepository } from '../../conversations/repositories/conversation.repository';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  /** Retrieves a single contact by ID for a tenant */
  async findById(id: string, tenantId: string): Promise<ContactResponseDto> {
    const contact = await this.contactRepository.findByIdAndTenantId(id, tenantId);

    if (!contact) {
      throw new NotFoundException('Contact not found.');
    }

    return ContactResponseDto.from(contact);
  }

  /** Retrieves all conversations for a contact, optionally excluding one */
  async findConversations(
    contactId: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<ConversationResponseDto[]> {
    // Verify the contact exists and belongs to the tenant
    const contact = await this.contactRepository.findByIdAndTenantId(contactId, tenantId);

    if (!contact) {
      throw new NotFoundException('Contact not found.');
    }

    const conversations = await this.conversationRepository.findByContactIdWithRelations(contactId, excludeId);

    return conversations.map(ConversationResponseDto.from);
  }
}
