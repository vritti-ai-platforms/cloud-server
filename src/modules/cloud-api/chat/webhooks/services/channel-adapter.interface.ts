/**
 * Unified representation of an incoming message parsed from any channel adapter.
 * All channel-specific payloads are normalized into this structure before
 * being handed to the WebhookHandlerService for processing.
 */
export interface ParsedIncomingMessage {
  /** Channel-specific contact identifier (chat_id for TG, phone for WA, instagram_id for IG) */
  sourceId: string;
  /** Display name extracted from the payload */
  senderName: string;
  /** Message text content */
  content: string;
  /** Detected content type based on the payload */
  contentType: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';
  /** Phone number if available (WhatsApp) */
  phone?: string;
  /** Username if available (Telegram) */
  username?: string;
  /** The original payload for debugging and audit purposes */
  rawPayload: unknown;
}

/**
 * Unified representation of a message delivery status update.
 * Used by WhatsApp to report sent/delivered/read/failed statuses.
 */
export interface ParsedStatusUpdate {
  // WhatsApp message ID (stored as externalMessageId in contentAttributes)
  externalMessageId: string;
  // Mapped status from the channel
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  // Timestamp of the status update
  timestamp: Date;
  // Error details if status is FAILED
  errorMessage?: string;
}

/**
 * Contract that every channel adapter must implement.
 * Each adapter is responsible for parsing the raw webhook payload
 * from its platform into the unified ParsedIncomingMessage format.
 */
export interface ChannelAdapter {
  /**
   * Parse a raw webhook payload into a unified message format.
   * Returns null if the payload does not contain a processable message
   * (e.g. status updates, delivery receipts, etc.).
   */
  parseIncomingMessage(payload: unknown): ParsedIncomingMessage | null;
}
