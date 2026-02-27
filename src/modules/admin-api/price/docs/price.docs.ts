import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PriceDto } from '../dto/entity/price.dto';
import { CreatePriceDto } from '../dto/request/create-price.dto';
import { UpdatePriceDto } from '../dto/request/update-price.dto';

export function ApiCreatePrice() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new price entry' }),
    ApiBody({ type: CreatePriceDto }),
    ApiResponse({ status: 201, description: 'Price created successfully.', type: PriceDto }),
    ApiResponse({ status: 400, description: 'Validation failed or invalid reference ID.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindAllPrices() {
  return applyDecorators(
    ApiOperation({ summary: 'List all prices' }),
    ApiResponse({ status: 200, description: 'Prices retrieved successfully.', type: PriceDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindPricesByPlan() {
  return applyDecorators(
    ApiOperation({ summary: 'List all prices for a plan' }),
    ApiParam({ name: 'planId', description: 'Plan UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Prices retrieved successfully.', type: PriceDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindPriceById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a price by ID' }),
    ApiParam({ name: 'id', description: 'Price UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Price retrieved successfully.', type: PriceDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Price not found.' }),
  );
}

export function ApiUpdatePrice() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a price' }),
    ApiParam({ name: 'id', description: 'Price UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: UpdatePriceDto }),
    ApiResponse({ status: 200, description: 'Price updated successfully.', type: PriceDto }),
    ApiResponse({ status: 400, description: 'Validation failed or invalid reference ID.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Price not found.' }),
  );
}

export function ApiDeletePrice() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a price' }),
    ApiParam({ name: 'id', description: 'Price UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Price deleted successfully.', type: PriceDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Price not found.' }),
  );
}
