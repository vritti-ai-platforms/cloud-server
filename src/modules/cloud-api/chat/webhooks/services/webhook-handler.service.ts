import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Contact, Conversation } from '@/db/schema';
import { InboxRepository } from '../../inboxes/repositories/inbox.repository';
import { ContactRepository } from '../../contacts/repositories/contact.repository';
import { ContactInboxRepository } from '../../contacts/repositories/contact-inbox.repository';
import { ConversationRepository } from '../../conversations/repositories/conversation.repository';
import { MessageRepository } from '../../messages/repositories/message.repository';
import { MessageResponseDto } from '../../messages/dto/entity/message-response.dto';
import type { ParsedIncomingMessage } from './channel-adapter.interface';

@Injectable()
export class WebhookHandlerService {
  private readonly logger = new Logger(WebhookHandlerService.name);

  constructor(
    private readonly inboxRepository: InboxRepository,
    private readonly contactRepository: ContactRepository,
    private readonly contactInboxRepository: ContactInboxRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Main handler: processes a parsed incoming message for an inbox.
   *
   * Flow:
   * 1. Find inbox (validates it exists and retrieves tenantId)
   * 2. Find or create ContactInbox + Contact
   * 3. Find existing OPEN conversation or create a new one
   * 4. Create the message record
   * 5. Update conversation denormalized fields
   * 6. Emit SSE events for real-time UI updates
   */
  async handleIncomingMessage(inboxId: string, parsed: ParsedIncomingMessage): Promise<void> {
    // 1. Find inbox
    const inbox = await this.inboxRepository.findById(inboxId);
    if (!inbox) {
      this.logger.warn(`Webhook received for unknown inbox: ${inboxId}`);
      return;
    }

    const tenantId = inbox.tenantId;

    // 2. Find or create ContactInbox (and Contact)
    const { contactInbox, contact } = await this.findOrCreateContactInbox(
      tenantId,
      inbox.id,
      parsed,
    );

    // 3. Find existing OPEN conversation or create new one
    const { conversation, isNew } = await this.findOrCreateConversation(
      tenantId,
      inbox.id,
      contact.id,
      contactInbox.id,
    );

    // 4. Create the message
    const message = await this.messageRepository.create({
      conversationId: conversation.id,
      content: parsed.content,
      contentType: parsed.contentType,
      senderType: 'CONTACT',
      senderId: contact.id,
      senderName: parsed.senderName,
      status: 'DELIVERED',
      isPrivate: false,
      contentAttributes: parsed.rawPayload ? { rawPayload: parsed.rawPayload } : undefined,
    });

    // 5. Update conversation lastMessage fields
    const conversationUpdate: Record<string, unknown> = {
      lastMessageContent: parsed.content,
      lastMessageAt: message.createdAt,
      lastMessageIsFromContact: true,
      unreadCount: (conversation.unreadCount ?? 0) + 1,
    };

    // Reopen conversation if it was resolved or snoozed
    if (conversation.status === 'RESOLVED' || conversation.status === 'SNOOZED') {
      conversationUpdate.status = 'OPEN';
    }

    await this.conversationRepository.update(conversation.id, conversationUpdate);

    // 6. Emit events for SSE
    if (isNew) {
      this.eventEmitter.emit('chat.new_conversation', {
        tenantId,
        conversationId: conversation.id,
      });
    }

    this.eventEmitter.emit('chat.new_message', {
      tenantId,
      conversationId: conversation.id,
      message: MessageResponseDto.from(message),
    });

    this.logger.log(
      `Processed incoming message for inbox ${inboxId}, conversation ${conversation.id}`,
    );
  }

  /**
   * Find an existing ContactInbox by the unique (inboxId, sourceId) pair,
   * or create a new Contact + ContactInbox if none exists.
   */
  private async findOrCreateContactInbox(
    tenantId: string,
    inboxId: string,
    parsed: ParsedIncomingMessage,
  ): Promise<{ contactInbox: { id: string }; contact: Contact }> {
    // Try to find existing contactInbox by unique (inboxId, sourceId)
    // The repository includes { with: { contact: true } } so the contact
    // relation is populated at runtime, but not reflected in the inferred type.
    const existing = (await this.contactInboxRepository.findByInboxAndSourceId(
      inboxId,
      parsed.sourceId,
    )) as ({ contact?: Contact } & Record<string, unknown>) | undefined;

    if (existing?.contact) {
      return { contactInbox: existing as { id: string }, contact: existing.contact };
    }

    // No existing contactInbox -- find or create the contact
    let contact: Contact | undefined;

    // Try to find existing contact by phone or username
    if (parsed.phone) {
      contact = await this.contactRepository.findByPhone(tenantId, parsed.phone);
    }
    if (!contact && parsed.username) {
      contact = await this.contactRepository.findByUsername(tenantId, parsed.username);
    }

    // Create new contact if not found
    if (!contact) {
      contact = await this.contactRepository.create({
        tenantId,
        name: parsed.senderName,
        phone: parsed.phone,
        username: parsed.username,
      });
      this.logger.log(`Created new contact: ${contact.id} for tenant ${tenantId}`);
    }

    // Create the contactInbox
    const contactInbox = await this.contactInboxRepository.create({
      contactId: contact.id,
      inboxId,
      sourceId: parsed.sourceId,
    });
    this.logger.log(`Created new contactInbox: ${contactInbox.id}`);

    return { contactInbox, contact };
  }

  /**
   * Find an existing OPEN conversation for this contactInbox,
   * or create a new conversation if none exists.
   */
  private async findOrCreateConversation(
    tenantId: string,
    inboxId: string,
    contactId: string,
    contactInboxId: string,
  ): Promise<{ conversation: Conversation; isNew: boolean }> {
    // Look for existing OPEN conversation for this contactInbox
    const existing = await this.conversationRepository.findByContactInboxId(
      contactInboxId,
      'OPEN',
    );

    if (existing) {
      return { conversation: existing, isNew: false };
    }

    // Create new conversation
    const conversation = await this.conversationRepository.create({
      tenantId,
      inboxId,
      contactId,
      contactInboxId,
      status: 'OPEN',
      unreadCount: 0,
    });

    this.logger.log(`Created new conversation: ${conversation.id} for tenant ${tenantId}`);

    return { conversation, isNew: true };
  }
}
