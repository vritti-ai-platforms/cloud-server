import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ContactResponseDto } from '../dto/entity/contact-response.dto';
import { ConversationResponseDto } from '../../conversations/dto/entity/conversation-response.dto';

export function ApiGetContact() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get a contact by ID',
      description: 'Retrieves the details of a single contact for the current tenant.',
    }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the contact',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Contact retrieved successfully',
      type: ContactResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Contact not found' }),
  );
}

export function ApiGetContactConversations() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get conversations for a contact',
      description:
        'Retrieves all conversations associated with a contact. Optionally excludes a specific conversation by ID.',
    }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the contact',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiQuery({
      name: 'exclude',
      required: false,
      description: 'Conversation ID to exclude from results',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Contact conversations retrieved successfully',
      type: [ConversationResponseDto],
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Contact not found' }),
  );
}
