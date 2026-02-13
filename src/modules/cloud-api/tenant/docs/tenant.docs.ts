import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { CreateTenantDto } from '../dto/request/create-tenant.dto';
import { TenantResponseDto } from '../dto/entity/tenant-response.dto';
import { UpdateTenantDto } from '../dto/request/update-tenant.dto';

export function ApiCreateTenant() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new tenant' }),
    ApiBody({ type: CreateTenantDto, description: 'Tenant creation data' }),
    ApiResponse({
      status: 201,
      description: 'Tenant successfully created',
      type: TenantResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 409, description: 'Conflict - Tenant with subdomain already exists' }),
  );
}

export function ApiFindAllTenants() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve all tenants' }),
    ApiResponse({
      status: 200,
      description: 'List of all tenants retrieved successfully',
      type: [TenantResponseDto],
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
  );
}

export function ApiFindTenantById() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve a tenant by ID' }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the tenant',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Tenant retrieved successfully',
      type: TenantResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Tenant not found' }),
  );
}

export function ApiFindTenantBySubdomain() {
  return applyDecorators(
    ApiOperation({ summary: 'Retrieve a tenant by subdomain' }),
    ApiParam({
      name: 'subdomain',
      description: 'Unique subdomain identifier of the tenant',
      example: 'acme-corp',
    }),
    ApiResponse({
      status: 200,
      description: 'Tenant retrieved successfully',
      type: TenantResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Tenant not found' }),
  );
}

export function ApiUpdateTenant() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a tenant' }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the tenant to update',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiBody({ type: UpdateTenantDto, description: 'Tenant update data' }),
    ApiResponse({
      status: 200,
      description: 'Tenant updated successfully',
      type: TenantResponseDto,
    }),
    ApiResponse({ status: 400, description: 'Invalid input data or validation failed' }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Tenant not found' }),
    ApiResponse({ status: 409, description: 'Conflict - Subdomain already in use by another tenant' }),
  );
}

export function ApiArchiveTenant() {
  return applyDecorators(
    ApiOperation({ summary: 'Archive a tenant (soft delete)' }),
    ApiParam({
      name: 'id',
      description: 'Unique identifier of the tenant to archive',
      example: '550e8400-e29b-41d4-a716-446655440000',
    }),
    ApiResponse({
      status: 200,
      description: 'Tenant archived successfully',
      type: TenantResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' }),
    ApiResponse({ status: 404, description: 'Tenant not found' }),
  );
}
