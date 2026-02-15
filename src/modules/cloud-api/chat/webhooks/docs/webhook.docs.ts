import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiTelegramWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: 'Telegram incoming webhook',
      description: 'Receives incoming message updates from Telegram Bot API.',
    }),
    ApiParam({
      name: 'inboxId',
      description: 'Unique identifier of the Telegram inbox',
    }),
    ApiResponse({ status: 200, description: 'Webhook received successfully.' }),
  );
}

export function ApiWhatsAppWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: 'WhatsApp incoming webhook',
      description: 'Receives incoming message updates from WhatsApp Cloud API.',
    }),
    ApiParam({
      name: 'inboxId',
      description: 'Unique identifier of the WhatsApp inbox',
    }),
    ApiResponse({ status: 200, description: 'Webhook received successfully.' }),
  );
}

export function ApiWhatsAppVerify() {
  return applyDecorators(
    ApiOperation({
      summary: 'WhatsApp webhook verification',
      description: 'Handles the Meta webhook subscription verification challenge.',
    }),
    ApiParam({
      name: 'inboxId',
      description: 'Unique identifier of the WhatsApp inbox',
    }),
    ApiResponse({ status: 200, description: 'Verification challenge returned.' }),
  );
}

export function ApiInstagramWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: 'Instagram incoming webhook',
      description: 'Receives incoming message updates from Instagram Messaging API.',
    }),
    ApiParam({
      name: 'inboxId',
      description: 'Unique identifier of the Instagram inbox',
    }),
    ApiResponse({ status: 200, description: 'Webhook received successfully.' }),
  );
}

export function ApiInstagramVerify() {
  return applyDecorators(
    ApiOperation({
      summary: 'Instagram webhook verification',
      description: 'Handles the Meta webhook subscription verification challenge.',
    }),
    ApiParam({
      name: 'inboxId',
      description: 'Unique identifier of the Instagram inbox',
    }),
    ApiResponse({ status: 200, description: 'Verification challenge returned.' }),
  );
}
