import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CloudProviderDto } from '../dto/entity/cloud-provider.dto';
import { CreateCloudProviderDto } from '../dto/request/create-cloud-provider.dto';
import { UpdateCloudProviderDto } from '../dto/request/update-cloud-provider.dto';

export function ApiCreateCloudProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new provider' }),
    ApiBody({ type: CreateCloudProviderDto }),
    ApiResponse({ status: 201, description: 'Provider created successfully.', type: CloudProviderDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Provider with this code already exists.' }),
  );
}

export function ApiFindAllCloudProviders() {
  return applyDecorators(
    ApiOperation({ summary: 'List all providers' }),
    ApiResponse({ status: 200, description: 'Providers retrieved successfully.', type: CloudProviderDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindCloudProviderById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a provider by ID' }),
    ApiParam({ name: 'id', description: 'Provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Provider retrieved successfully.', type: CloudProviderDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Provider not found.' }),
  );
}

export function ApiUpdateCloudProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a provider' }),
    ApiParam({ name: 'id', description: 'Provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: UpdateCloudProviderDto }),
    ApiResponse({ status: 200, description: 'Provider updated successfully.', type: CloudProviderDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Provider not found.' }),
    ApiResponse({ status: 409, description: 'Provider with this code already exists.' }),
  );
}

export function ApiDeleteCloudProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a provider' }),
    ApiParam({ name: 'id', description: 'Provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Provider deleted successfully.', type: CloudProviderDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Provider not found.' }),
  );
}
