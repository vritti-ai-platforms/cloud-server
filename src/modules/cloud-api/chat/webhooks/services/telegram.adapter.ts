import { Injectable } from '@nestjs/common';
import type { ChannelAdapter, ParsedIncomingMessage } from './channel-adapter.interface';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  /**
   * Parses a Telegram Bot API webhook payload into a unified message.
   * Returns null if the payload does not contain a message object.
   *
   * @see https://core.telegram.org/bots/api#update
   */
  parseIncomingMessage(payload: any): ParsedIncomingMessage | null {
    const message = payload?.message;
    if (!message) return null;

    return {
      sourceId: String(message.chat.id),
      senderName:
        [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || 'Unknown',
      content: message.text || '',
      contentType: this.detectContentType(message),
      username: message.from?.username,
      rawPayload: payload,
    };
  }

  private detectContentType(message: any): ParsedIncomingMessage['contentType'] {
    if (message.photo) return 'IMAGE';
    if (message.document) return 'FILE';
    if (message.audio || message.voice) return 'AUDIO';
    if (message.video || message.video_note) return 'VIDEO';
    return 'TEXT';
  }
}
