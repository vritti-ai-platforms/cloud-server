import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { RegionDto } from '../dto/entity/region.dto';
import { AssignProvidersDto } from '../dto/request/assign-providers.dto';
import { CreateRegionDto } from '../dto/request/create-region.dto';
import { UpdateRegionDto } from '../dto/request/update-region.dto';
import { AssignProvidersResponseDto } from '../dto/response/assign-providers-response.dto';

export function ApiCreateRegion() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new region' }),
    ApiBody({ type: CreateRegionDto }),
    ApiResponse({ status: 201, description: 'Region created successfully.', type: RegionDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Region with this code already exists.' }),
  );
}

export function ApiFindAllRegions() {
  return applyDecorators(
    ApiOperation({ summary: 'List all regions' }),
    ApiResponse({ status: 200, description: 'Regions retrieved successfully.', type: RegionDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindRegionById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a region by ID' }),
    ApiParam({ name: 'id', description: 'Region UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Region retrieved successfully.', type: RegionDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Region not found.' }),
  );
}

export function ApiUpdateRegion() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a region' }),
    ApiParam({ name: 'id', description: 'Region UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: UpdateRegionDto }),
    ApiResponse({ status: 200, description: 'Region updated successfully.', type: RegionDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Region not found.' }),
    ApiResponse({ status: 409, description: 'Region with this code already exists.' }),
  );
}

export function ApiDeleteRegion() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a region' }),
    ApiParam({ name: 'id', description: 'Region UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Region deleted successfully.', type: RegionDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Region not found.' }),
  );
}

export function ApiAssignRegionProviders() {
  return applyDecorators(
    ApiOperation({ summary: 'Bulk assign cloud providers to a region' }),
    ApiParam({ name: 'id', description: 'Region UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: AssignProvidersDto }),
    ApiResponse({ status: 201, description: 'Cloud providers assigned successfully.', type: AssignProvidersResponseDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Region not found.' }),
  );
}
