import { Injectable } from '@nestjs/common';
import type { ChannelAdapter, ParsedIncomingMessage } from './channel-adapter.interface';

@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  /**
   * Parses a Meta WhatsApp Cloud API webhook payload into a unified message.
   * Returns null if the payload does not contain a processable message.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
   */
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

  /**
   * Verify the webhook subscription challenge from Meta.
   * When Meta sends a GET request with hub.mode=subscribe, we must return
   * the hub.challenge value if the verify_token matches our expected token.
   *
   * @returns The challenge string if verification succeeds, null otherwise
   */
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
