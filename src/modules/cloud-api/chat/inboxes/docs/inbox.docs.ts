import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { InboxResponseDto } from '../dto/entity/inbox-response.dto';
import { CreateTelegramInboxDto } from '../dto/request/create-telegram-inbox.dto';
import { CreateInstagramInboxDto } from '../dto/request/create-instagram-inbox.dto';
import { CreateWhatsAppInboxDto } from '../dto/request/create-whatsapp-inbox.dto';
import { CreateInboxResponseDto } from '../dto/response/create-inbox-response.dto';
import { InboxListResponseDto } from '../dto/response/inbox-list-response.dto';

export function ApiCreateTelegramInbox() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a Telegram inbox',
      description:
        'Creates a new inbox connected to a Telegram bot. The bot token is validated against the Telegram API. ' +
        'If no name is provided, the bot name is auto-detected from the Telegram API.',
    }),
    ApiBody({ type: CreateTelegramInboxDto }),
    ApiResponse({ status: 201, description: 'Telegram inbox created successfully.', type: CreateInboxResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid input data, validation failed, or the bot token is invalid.' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}

export function ApiCreateInstagramInbox() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create an Instagram inbox',
      description:
        'Creates a new inbox connected to an Instagram account via the Graph API. Requires a valid access token and page ID.',
    }),
    ApiBody({ type: CreateInstagramInboxDto }),
    ApiResponse({ status: 201, description: 'Instagram inbox created successfully.', type: CreateInboxResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}

export function ApiCreateWhatsAppInbox() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a WhatsApp inbox',
      description:
        'Creates a new inbox connected to a WhatsApp Business account. Requires access token, phone number ID, business account ID, and a webhook verify token.',
    }),
    ApiBody({ type: CreateWhatsAppInboxDto }),
    ApiResponse({ status: 201, description: 'WhatsApp inbox created successfully.', type: CreateInboxResponseDto }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}

export function ApiListInboxes() {
  return applyDecorators(
    ApiOperation({
      summary: 'List all inboxes',
      description: "Retrieves a paginated list of inboxes for the authenticated user's tenant.",
    }),
    ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (defaults to 1)' }),
    ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (defaults to 20)' }),
    ApiResponse({ status: 200, description: 'Paginated list of inboxes.', type: InboxListResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}

export function ApiGetInbox() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get an inbox by ID',
      description: 'Retrieves a single inbox by its unique identifier. Only returns inboxes belonging to the current tenant.',
    }),
    ApiParam({ name: 'id', description: 'Unique identifier of the inbox' }),
    ApiResponse({ status: 200, description: 'Inbox retrieved successfully.', type: InboxResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
    ApiResponse({ status: 404, description: 'Inbox not found.' }),
  );
}

export function ApiDeleteInbox() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete an inbox',
      description: 'Permanently deletes an inbox and all associated data. Only deletes inboxes belonging to the current tenant.',
    }),
    ApiParam({ name: 'id', description: 'Unique identifier of the inbox to delete' }),
    ApiResponse({ status: 204, description: 'Inbox deleted successfully.' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
    ApiResponse({ status: 404, description: 'Inbox not found.' }),
  );
}
