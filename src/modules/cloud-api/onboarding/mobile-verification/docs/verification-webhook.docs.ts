import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiHeader, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';

export function ApiVerifyWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: 'Verify webhook endpoint (Meta/Twilio subscription verification)',
      description: `Handles webhook subscription verification from Meta (WhatsApp) and Twilio (SMS).

    For WhatsApp: Returns hub.challenge if hub.verify_token matches.
    For SMS: Returns challenge if verify_token matches.`,
    }),
    ApiParam({
      name: 'provider',
      enum: ['whatsapp', 'sms'],
      description: 'Webhook provider type',
    }),
    ApiQuery({
      name: 'hub.mode',
      required: false,
      description: 'WhatsApp: Subscription mode (should be "subscribe")',
    }),
    ApiQuery({
      name: 'hub.challenge',
      required: false,
      description: 'WhatsApp: Challenge string to echo back',
    }),
    ApiQuery({
      name: 'hub.verify_token',
      required: false,
      description: 'WhatsApp: Verification token to validate',
    }),
    ApiQuery({
      name: 'verify_token',
      required: false,
      description: 'SMS/Twilio: Verification token to validate',
    }),
    ApiQuery({
      name: 'challenge',
      required: false,
      description: 'SMS/Twilio: Challenge string to echo back',
    }),
    ApiResponse({
      status: 200,
      description: 'Webhook verified successfully, returns the challenge string',
      schema: { type: 'string' },
    }),
    ApiResponse({ status: 400, description: 'Unsupported provider' }),
    ApiResponse({ status: 401, description: 'Invalid verification token' }),
  );
}

export function ApiHandleWebhook() {
  return applyDecorators(
    ApiOperation({
      summary: 'Handle incoming webhook events from WhatsApp or SMS providers',
      description: `Receives and processes incoming message webhooks from Meta (WhatsApp) and Twilio (SMS).

    Validates webhook signatures before processing:
    - WhatsApp: Uses X-Hub-Signature-256 header (HMAC-SHA256)
    - SMS: Uses X-Twilio-Signature header (HMAC-SHA1)

    Messages containing verification tokens are processed to complete mobile verification.`,
    }),
    ApiParam({
      name: 'provider',
      enum: ['whatsapp', 'sms'],
      description: 'Webhook provider type',
    }),
    ApiHeader({
      name: 'x-hub-signature-256',
      required: false,
      description: 'WhatsApp webhook signature (HMAC-SHA256)',
    }),
    ApiHeader({
      name: 'x-twilio-signature',
      required: false,
      description: 'Twilio SMS webhook signature (HMAC-SHA1)',
    }),
    ApiBody({
      description: 'Webhook payload from provider (WhatsApp or Twilio format)',
      schema: {
        oneOf: [
          {
            type: 'object',
            description: 'WhatsApp webhook payload',
            properties: {
              object: { type: 'string', example: 'whatsapp_business_account' },
              entry: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    changes: { type: 'array' },
                  },
                },
              },
            },
          },
          {
            type: 'object',
            description: 'Twilio SMS webhook payload',
            properties: {
              MessageSid: { type: 'string' },
              From: { type: 'string' },
              To: { type: 'string' },
              Body: { type: 'string' },
            },
          },
        ],
      },
    }),
    ApiResponse({
      status: 200,
      description: 'Webhook received and queued for processing',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
        },
      },
    }),
    ApiResponse({ status: 400, description: 'Unsupported provider or malformed payload' }),
    ApiResponse({ status: 401, description: 'Invalid webhook signature' }),
  );
}
