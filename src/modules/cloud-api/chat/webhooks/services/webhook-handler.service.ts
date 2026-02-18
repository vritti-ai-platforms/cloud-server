import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Contact, Conversation } from '@/db/schema';
import { InboxRepository } from '../../inboxes/repositories/inbox.repository';
import { ContactRepository } from '../../contacts/repositories/contact.repository';
import { ContactInboxRepository } from '../../contacts/repositories/contact-inbox.repository';
import { ConversationRepository } from '../../conversations/repositories/conversation.repository';
import { MessageRepository } from '../../messages/repositories/message.repository';
import { MessageResponseDto } from '../../messages/dto/entity/message-response.dto';
import type { ParsedIncomingMessage, ParsedStatusUpdate } from './channel-adapter.interface';

// ============================================================================
// Instagram Channel Config
// ============================================================================

interface InstagramChannelConfig {
  accessToken?: string;
}

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

  // Processes a parsed incoming message: resolves contact/conversation, creates message, emits events
  async handleIncomingMessage(inboxId: string, parsed: ParsedIncomingMessage): Promise<void> {
    // 1. Find inbox
    const inbox = await this.inboxRepository.findById(inboxId);
    if (!inbox) {
      this.logger.warn(`Webhook received for unknown inbox: ${inboxId}`);
      return;
    }

    const tenantId = inbox.tenantId;

    // 1b. Resolve Instagram sender name if it's just a numeric ID
    if (inbox.channelType === 'INSTAGRAM' && /^\d+$/.test(parsed.senderName)) {
      const resolvedName = await this.resolveInstagramSenderName(
        parsed.sourceId,
        inbox.channelConfig as InstagramChannelConfig,
      );
      if (resolvedName) {
        parsed.senderName = resolvedName.name;
        parsed.username = resolvedName.username;
      }
    }

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

  // Handles delivery/read status updates from WhatsApp Cloud API
  async handleStatusUpdate(statusUpdate: ParsedStatusUpdate): Promise<void> {
    const message = await this.messageRepository.findByExternalMessageId(statusUpdate.externalMessageId);

    if (!message) {
      this.logger.debug(`No message found for external ID: ${statusUpdate.externalMessageId}`);
      return;
    }

    // Only update if the new status is a progression (SENT → DELIVERED → READ)
    const statusOrder = { SENDING: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4 };
    const currentOrder = statusOrder[message.status as keyof typeof statusOrder] ?? 0;
    const newOrder = statusOrder[statusUpdate.status] ?? 0;

    // FAILED always overrides; otherwise only advance forward
    if (statusUpdate.status !== 'FAILED' && newOrder <= currentOrder) {
      return;
    }

    await this.messageRepository.updateStatus(message.id, statusUpdate.status);
    this.logger.log(
      `Updated message ${message.id} status to ${statusUpdate.status} (external: ${statusUpdate.externalMessageId})`,
    );
  }

  // Finds an existing ContactInbox by (inboxId, sourceId) or creates a new Contact + ContactInbox
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
      // Update contact name if it's still a numeric ID (unresolved Instagram sender)
      if (existing.contact.name && /^\d+$/.test(existing.contact.name) && parsed.senderName && !/^\d+$/.test(parsed.senderName)) {
        await this.contactRepository.update(existing.contact.id, {
          name: parsed.senderName,
          username: parsed.username || existing.contact.username,
        });
        existing.contact.name = parsed.senderName;
        if (parsed.username) existing.contact.username = parsed.username;
        this.logger.log(`Updated contact ${existing.contact.id} name to: ${parsed.senderName}`);
      }
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

  // Resolves the Instagram sender's display name and username via the Graph API
  private async resolveInstagramSenderName(
    senderId: string,
    channelConfig: InstagramChannelConfig,
  ): Promise<{ name: string; username: string } | null> {
    const accessToken = channelConfig?.accessToken;
    if (!accessToken) return null;

    try {
      const params = new URLSearchParams({
        fields: 'name,username',
        access_token: accessToken,
      });

      const response = await fetch(
        `https://graph.instagram.com/v22.0/${senderId}?${params.toString()}`,
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch Instagram profile for sender ${senderId} (HTTP ${response.status})`,
        );
        return null;
      }

      const data = (await response.json()) as { name?: string; username?: string };
      return {
        name: data.name || data.username || senderId,
        username: data.username || '',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.logger.warn(`Instagram profile fetch failed for sender ${senderId}: ${err.message}`);
      return null;
    }
  }

  // Finds an existing OPEN conversation for this contactInbox or creates a new one
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
