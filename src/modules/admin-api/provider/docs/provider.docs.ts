import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ProviderDto } from '../dto/entity/provider.dto';
import { CreateProviderDto } from '../dto/request/create-provider.dto';
import { UpdateProviderDto } from '../dto/request/update-provider.dto';

export function ApiCreateProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new provider' }),
    ApiBody({ type: CreateProviderDto }),
    ApiResponse({ status: 201, description: 'Provider created successfully.', type: ProviderDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Provider with this code already exists.' }),
  );
}

export function ApiFindAllProviders() {
  return applyDecorators(
    ApiOperation({ summary: 'List all providers' }),
    ApiResponse({ status: 200, description: 'Providers retrieved successfully.', type: ProviderDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindProviderById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a provider by ID' }),
    ApiParam({ name: 'id', description: 'Provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Provider retrieved successfully.', type: ProviderDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Provider not found.' }),
  );
}

export function ApiUpdateProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a provider' }),
    ApiParam({ name: 'id', description: 'Provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: UpdateProviderDto }),
    ApiResponse({ status: 200, description: 'Provider updated successfully.', type: ProviderDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Provider not found.' }),
    ApiResponse({ status: 409, description: 'Provider with this code already exists.' }),
  );
}

export function ApiDeleteProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a provider' }),
    ApiParam({ name: 'id', description: 'Provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Provider deleted successfully.', type: ProviderDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Provider not found.' }),
  );
}
