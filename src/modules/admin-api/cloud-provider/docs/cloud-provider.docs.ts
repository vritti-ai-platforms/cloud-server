import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SuccessResponseDto } from '@vritti/api-sdk';
import { CloudProviderDto } from '../dto/entity/cloud-provider.dto';
import { CreateCloudProviderDto } from '../dto/request/create-cloud-provider.dto';
import { UpdateCloudProviderDto } from '../dto/request/update-cloud-provider.dto';
import { CloudProviderSelectResponseDto } from '../dto/response/cloud-provider-select-response.dto';
import { CloudProviderTableResponseDto } from '../dto/response/cloud-providers-response.dto';

export function ApiCreateCloudProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new cloud provider' }),
    ApiBody({ type: CreateCloudProviderDto }),
    ApiResponse({ status: 201, description: 'Cloud provider created successfully.', type: SuccessResponseDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Cloud provider with this code already exists.' }),
  );
}

export function ApiFindCloudProvidersSelect() {
  return applyDecorators(
    ApiOperation({ summary: 'Get cloud providers for select component' }),
    ApiQuery({ name: 'search', required: false }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiQuery({ name: 'offset', required: false, type: Number }),
    ApiResponse({
      status: 200,
      description: 'Cloud provider options retrieved.',
      type: CloudProviderSelectResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindForTableCloudProviders() {
  return applyDecorators(
    ApiOperation({ summary: 'List cloud providers for data table (server-stored state)' }),
    ApiResponse({
      status: 200,
      description: 'Cloud providers retrieved successfully.',
      type: CloudProviderTableResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindCloudProviderById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a cloud provider by ID' }),
    ApiParam({ name: 'id', description: 'Cloud provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Cloud provider retrieved successfully.', type: CloudProviderDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Cloud provider not found.' }),
  );
}

export function ApiUpdateCloudProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a cloud provider' }),
    ApiParam({ name: 'id', description: 'Cloud provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: UpdateCloudProviderDto }),
    ApiResponse({ status: 200, description: 'Cloud provider updated successfully.', type: SuccessResponseDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Cloud provider not found.' }),
    ApiResponse({ status: 409, description: 'Cloud provider with this code already exists.' }),
  );
}

export function ApiDeleteCloudProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a cloud provider' }),
    ApiParam({ name: 'id', description: 'Cloud provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Cloud provider deleted successfully.', type: SuccessResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Cloud provider not found.' }),
  );
}
