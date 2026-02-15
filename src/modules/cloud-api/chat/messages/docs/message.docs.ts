import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { MessageResponseDto } from '../dto/entity/message-response.dto';
import { SendMessageDto } from '../dto/request/send-message.dto';

export function ApiListMessages() {
  return applyDecorators(
    ApiOperation({
      summary: 'List messages in a conversation',
      description:
        'Retrieves a paginated list of messages for a specific conversation, sorted by creation time in ascending order.',
    }),
    ApiParam({
      name: 'conversationId',
      description: 'Unique identifier of the conversation',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (defaults to 1)',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of messages per page (defaults to 20)',
      example: 20,
    }),
    ApiResponse({
      status: 200,
      description: 'Paginated list of messages retrieved successfully.',
      schema: {
        type: 'object',
        properties: {
          messages: { type: 'array', items: { $ref: '#/components/schemas/MessageResponseDto' } },
          total: { type: 'number', example: 150 },
          page: { type: 'number', example: 1 },
          limit: { type: 'number', example: 20 },
        },
      },
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
    ApiResponse({ status: 404, description: 'Conversation not found.' }),
  );
}

export function ApiSendMessage() {
  return applyDecorators(
    ApiOperation({
      summary: 'Send an agent reply',
      description:
        'Sends a new message from the authenticated agent to the specified conversation. Reopens resolved or snoozed conversations automatically.',
    }),
    ApiParam({
      name: 'conversationId',
      description: 'Unique identifier of the conversation',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({ type: SendMessageDto }),
    ApiResponse({
      status: 201,
      description: 'Message sent successfully.',
      type: MessageResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication.' }),
    ApiResponse({ status: 404, description: 'Conversation not found.' }),
  );
}
