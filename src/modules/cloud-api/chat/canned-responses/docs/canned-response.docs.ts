import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CannedResponseResponseDto } from '../dto/entity/canned-response-response.dto';
import { CreateCannedResponseDto } from '../dto/request/create-canned-response.dto';
import { UpdateCannedResponseDto } from '../dto/request/update-canned-response.dto';

export function ApiListCannedResponses() {
  return applyDecorators(
    ApiOperation({
      summary: 'List all canned responses',
      description: 'Retrieves all canned responses for the current tenant, ordered by short code.',
    }),
    ApiResponse({
      status: 200,
      description: 'List of canned responses retrieved successfully',
      type: [CannedResponseResponseDto],
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
  );
}

export function ApiCreateCannedResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a canned response',
      description: 'Creates a new canned response with a unique short code for the current tenant.',
    }),
    ApiBody({ type: CreateCannedResponseDto }),
    ApiResponse({
      status: 201,
      description: 'Canned response created successfully',
      type: CannedResponseResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 409, description: 'Conflict - A canned response with this short code already exists' }),
  );
}

export function ApiUpdateCannedResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Update a canned response',
      description: 'Updates an existing canned response by ID for the current tenant.',
    }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the canned response',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({ type: UpdateCannedResponseDto }),
    ApiResponse({
      status: 200,
      description: 'Canned response updated successfully',
      type: CannedResponseResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Canned response not found' }),
    ApiResponse({ status: 409, description: 'Conflict - A canned response with this short code already exists' }),
  );
}

export function ApiDeleteCannedResponse() {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete a canned response',
      description: 'Permanently deletes a canned response by ID for the current tenant.',
    }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the canned response to delete',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({ status: 204, description: 'Canned response deleted successfully' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Canned response not found' }),
  );
}
