import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SuccessResponseDto } from '@vritti/api-sdk';
import { RegionDto } from '../dto/entity/region.dto';
import { CreateRegionDto } from '../dto/request/create-region.dto';
import { UpdateRegionDto } from '../dto/request/update-region.dto';
import { RegionTableResponseDto } from '../dto/response/regions-response.dto';

export function ApiCreateRegion() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new region' }),
    ApiBody({ type: CreateRegionDto }),
    ApiResponse({ status: 201, description: 'Region created successfully.', type: SuccessResponseDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Region with this code already exists.' }),
  );
}

export function ApiFindForTableRegions() {
  return applyDecorators(
    ApiOperation({ summary: 'List regions for data table (server-stored state)' }),
    ApiResponse({ status: 200, description: 'Regions retrieved successfully.', type: RegionTableResponseDto }),
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
    ApiResponse({ status: 200, description: 'Region updated successfully.', type: SuccessResponseDto }),
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
    ApiResponse({ status: 200, description: 'Region deleted successfully.', type: SuccessResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Region not found.' }),
  );
}

export function ApiAddRegionCloudProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Assign a cloud provider to a region' }),
    ApiParam({ name: 'id', description: 'Region UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiParam({ name: 'providerId', description: 'Cloud Provider UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 201, description: 'Cloud provider assigned successfully.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Region not found.' }),
  );
}

export function ApiRemoveRegionCloudProvider() {
  return applyDecorators(
    ApiOperation({ summary: 'Remove a cloud provider from a region' }),
    ApiParam({ name: 'id', description: 'Region ID' }),
    ApiParam({ name: 'providerId', description: 'Cloud Provider ID' }),
    ApiResponse({ status: 200, description: 'Cloud provider removed from region.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Region or provider assignment not found.' }),
  );
}
