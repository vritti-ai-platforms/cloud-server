import { Injectable } from '@nestjs/common';
import type { ChannelAdapter, ParsedIncomingMessage } from './channel-adapter.interface';

@Injectable()
export class InstagramAdapter implements ChannelAdapter {
  // Parses an Instagram Messaging webhook payload into a unified message
  parseIncomingMessage(payload: any): ParsedIncomingMessage | null {
    const entry = payload?.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging?.message) return null;

    // Ignore echo messages — these are messages sent BY the business account
    // (e.g. agent replies dispatched via Graph API). Instagram webhooks fire
    // for both inbound and outbound messages; echoes have is_echo=true or
    // the sender matches the business account (entry.id).
    if (messaging.message.is_echo) return null;

    const businessAccountId = entry?.id?.toString();
    const senderId = messaging.sender?.id?.toString();
    if (businessAccountId && senderId === businessAccountId) return null;

    return {
      sourceId: senderId,
      senderName: senderId, // Instagram does not send name in webhook; resolved later via API
      content: messaging.message.text || '',
      contentType: messaging.message.attachments
        ? this.detectAttachmentType(messaging.message.attachments[0])
        : 'TEXT',
      rawPayload: payload,
    };
  }

  private detectAttachmentType(attachment: any): ParsedIncomingMessage['contentType'] {
    switch (attachment?.type) {
      case 'image':
        return 'IMAGE';
      case 'video':
        return 'VIDEO';
      case 'audio':
        return 'AUDIO';
      case 'file':
        return 'FILE';
      default:
        return 'TEXT';
    }
  }

  // Extracts the recipient Instagram ID from the webhook payload for inbox routing
  extractRecipientId(payload: any): string | null {
    return payload?.entry?.[0]?.id?.toString() || null;
  }

  // Verifies the webhook subscription challenge from Meta
  verifyWebhook(
    query: { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string },
    expectedToken: string,
  ): string | null {
    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === expectedToken) {
      return query['hub.challenge'] || null;
    }
    return null;
  }
}
