import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PlanDto } from '../dto/entity/plan.dto';
import { CreatePlanDto } from '../dto/request/create-plan.dto';
import { UpdatePlanDto } from '../dto/request/update-plan.dto';

export function ApiCreatePlan() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new plan' }),
    ApiBody({ type: CreatePlanDto }),
    ApiResponse({ status: 201, description: 'Plan created successfully.', type: PlanDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 409, description: 'Plan with this code already exists.' }),
  );
}

export function ApiFindAllPlans() {
  return applyDecorators(
    ApiOperation({ summary: 'List all plans' }),
    ApiResponse({ status: 200, description: 'Plans retrieved successfully.', type: PlanDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindPlanById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a plan by ID' }),
    ApiParam({ name: 'id', description: 'Plan UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Plan retrieved successfully.', type: PlanDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Plan not found.' }),
  );
}

export function ApiUpdatePlan() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a plan' }),
    ApiParam({ name: 'id', description: 'Plan UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: UpdatePlanDto }),
    ApiResponse({ status: 200, description: 'Plan updated successfully.', type: PlanDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Plan not found.' }),
    ApiResponse({ status: 409, description: 'Plan with this code already exists.' }),
  );
}

export function ApiDeletePlan() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a plan' }),
    ApiParam({ name: 'id', description: 'Plan UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Plan deleted successfully.', type: PlanDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Plan not found.' }),
  );
}
