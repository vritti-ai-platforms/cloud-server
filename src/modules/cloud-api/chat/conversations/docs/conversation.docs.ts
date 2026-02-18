import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ConversationResponseDto } from '../dto/entity/conversation-response.dto';
import { ConversationListResponseDto } from '../dto/response/conversation-list-response.dto';
import { ConversationCountsResponseDto } from '../dto/response/conversation-counts-response.dto';
import { UpdateConversationDto } from '../dto/request/update-conversation.dto';

export function ApiListConversations() {
  return applyDecorators(
    ApiOperation({
      summary: 'List conversations',
      description:
        'Retrieves a paginated list of conversations for the current tenant. Supports filtering by status, channel type, inbox, and search term. Results are sorted by most recently updated.',
    }),
    ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'RESOLVED', 'PENDING', 'SNOOZED'] }),
    ApiQuery({ name: 'search', required: false, description: 'Search by last message content' }),
    ApiQuery({ name: 'channelType', required: false, enum: ['TELEGRAM', 'INSTAGRAM', 'WHATSAPP'] }),
    ApiQuery({ name: 'inboxId', required: false, description: 'Filter by inbox identifier' }),
    ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' }),
    ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' }),
    ApiResponse({ status: 200, description: 'Paginated list of conversations retrieved successfully.', type: ConversationListResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}

export function ApiGetConversationCounts() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get conversation status counts',
      description: 'Returns the count of conversations grouped by status for the current tenant.',
    }),
    ApiResponse({ status: 200, description: 'Conversation counts retrieved successfully.', type: ConversationCountsResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
  );
}

export function ApiGetConversation() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a conversation by ID',
      description: 'Retrieves a single conversation with embedded contact details for the current tenant.',
    }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the conversation',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Conversation retrieved successfully',
      type: ConversationResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Conversation not found' }),
  );
}

export function ApiUpdateConversation() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a conversation',
      description: 'Updates conversation fields such as status, assigned agent, labels, or unread count.',
    }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the conversation to update',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({ type: UpdateConversationDto }),
    ApiResponse({
      status: 200,
      description: 'Conversation updated successfully',
      type: ConversationResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Conversation not found' }),
  );
}
