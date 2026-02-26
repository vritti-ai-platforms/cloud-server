import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { IndustryDto } from '../dto/entity/industry.dto';
import { CreateIndustryDto } from '../dto/request/create-industry.dto';
import { UpdateIndustryDto } from '../dto/request/update-industry.dto';

export function ApiCreateIndustry() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new industry' }),
    ApiBody({ type: CreateIndustryDto }),
    ApiResponse({ status: 201, description: 'Industry created successfully.', type: IndustryDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Industry with this slug already exists.' }),
  );
}

export function ApiFindAllIndustries() {
  return applyDecorators(
    ApiOperation({ summary: 'List all industries' }),
    ApiResponse({ status: 200, description: 'Industries retrieved successfully.', type: IndustryDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindIndustryById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get an industry by ID' }),
    ApiParam({ name: 'id', description: 'Industry UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Industry retrieved successfully.', type: IndustryDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Industry not found.' }),
  );
}

export function ApiUpdateIndustry() {
  return applyDecorators(
    ApiOperation({ summary: 'Update an industry' }),
    ApiParam({ name: 'id', description: 'Industry UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: UpdateIndustryDto }),
    ApiResponse({ status: 200, description: 'Industry updated successfully.', type: IndustryDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Industry not found.' }),
    ApiResponse({ status: 409, description: 'Industry with this slug already exists.' }),
  );
}

export function ApiDeleteIndustry() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete an industry' }),
    ApiParam({ name: 'id', description: 'Industry UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Industry deleted successfully.', type: IndustryDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Industry not found.' }),
  );
}
