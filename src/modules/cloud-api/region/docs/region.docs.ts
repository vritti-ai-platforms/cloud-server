import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ProviderOptionDto } from '../dto/response/provider-option.dto';
import { RegionOptionDto } from '../dto/response/region-option.dto';

export function ApiGetRegions() {
  return applyDecorators(
    ApiOperation({ summary: 'List all active regions' }),
    ApiResponse({ status: 200, description: 'Regions retrieved successfully.', type: RegionOptionDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiGetRegionProviders() {
  return applyDecorators(
    ApiOperation({ summary: 'List cloud providers available in a region' }),
    ApiParam({ name: 'id', description: 'Region UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Providers retrieved successfully.', type: ProviderOptionDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Region not found.' }),
  );
}
