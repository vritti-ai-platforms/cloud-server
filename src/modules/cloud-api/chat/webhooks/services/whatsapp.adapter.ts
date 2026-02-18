import { Injectable } from '@nestjs/common';
import type { ChannelAdapter, ParsedIncomingMessage, ParsedStatusUpdate } from './channel-adapter.interface';

@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  // Parses a WhatsApp Cloud API webhook payload into a unified message
  parseIncomingMessage(payload: any): ParsedIncomingMessage | null {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.messages?.[0]) return null;

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    return {
      sourceId: message.from,
      senderName: contact?.profile?.name || message.from,
      content: message.text?.body || message.caption || '',
      contentType: this.detectContentType(message),
      phone: message.from,
      rawPayload: payload,
    };
  }

  private detectContentType(message: any): ParsedIncomingMessage['contentType'] {
    if (message.image) return 'IMAGE';
    if (message.document) return 'FILE';
    if (message.audio) return 'AUDIO';
    if (message.video) return 'VIDEO';
    return 'TEXT';
  }

  // Parses delivery/read status updates from WhatsApp Cloud API webhooks
  parseStatusUpdate(payload: any): ParsedStatusUpdate | null {
    const entry = payload?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value?.statuses?.[0]) return null;

    const status = value.statuses[0];
    const mappedStatus = this.mapWhatsAppStatus(status.status);
    if (!mappedStatus) return null;

    return {
      externalMessageId: status.id,
      status: mappedStatus,
      timestamp: new Date(Number(status.timestamp) * 1000),
      errorMessage: status.errors?.[0]?.title,
    };
  }

  // Extracts the phone_number_id from a WhatsApp webhook payload for inbox routing
  extractPhoneNumberId(payload: any): string | null {
    return payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id || null;
  }

  // Maps WhatsApp status strings to our internal MessageStatus enum values
  private mapWhatsAppStatus(status: string): ParsedStatusUpdate['status'] | null {
    switch (status) {
      case 'sent': return 'SENT';
      case 'delivered': return 'DELIVERED';
      case 'read': return 'READ';
      case 'failed': return 'FAILED';
      default: return null;
    }
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
