import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DeploymentDto } from '../dto/entity/deployment.dto';
import { DeploymentPlanAssignmentDto } from '../dto/entity/deployment-plan-assignment.dto';
import { DeploymentPlanListItemDto } from '../dto/entity/deployment-plan-list-item.dto';
import { DeploymentPlanPriceDto } from '../dto/entity/deployment-plan-price.dto';
import { AssignDeploymentPlanDto } from '../dto/request/assign-deployment-plan.dto';
import { CreateDeploymentDto } from '../dto/request/create-deployment.dto';
import { UpdateDeploymentDto } from '../dto/request/update-deployment.dto';
import { AssignDeploymentPlanResponseDto } from '../dto/response/assign-deployment-plan-response.dto';
import { DeploymentSelectResponseDto } from '../dto/response/deployment-select-response.dto';
import { DeploymentsResponseDto } from '../dto/response/deployments-response.dto';

export function ApiCreateDeployment() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new deployment' }),
    ApiBody({ type: CreateDeploymentDto }),
    ApiResponse({ status: 201, description: 'Deployment created successfully.', type: DeploymentDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindDeploymentsSelect() {
  return applyDecorators(
    ApiOperation({ summary: 'Get deployments for select component' }),
    ApiQuery({ name: 'search', required: false }),
    ApiQuery({ name: 'limit', required: false, type: Number }),
    ApiQuery({ name: 'offset', required: false, type: Number }),
    ApiQuery({ name: 'regionId', required: false, description: 'Filter by region ID' }),
    ApiQuery({ name: 'cloudProviderId', required: false, description: 'Filter by cloud provider ID' }),
    ApiResponse({
      status: 200,
      description: 'Deployment options retrieved.',
      type: DeploymentSelectResponseDto,
    }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindAllDeployments() {
  return applyDecorators(
    ApiOperation({ summary: 'List all deployments' }),
    ApiResponse({ status: 200, description: 'Deployments retrieved successfully.', type: DeploymentsResponseDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindDeploymentById() {
  return applyDecorators(
    ApiOperation({ summary: 'Get a deployment by ID' }),
    ApiParam({ name: 'id', description: 'Deployment UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Deployment retrieved successfully.', type: DeploymentDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Deployment not found.' }),
  );
}

export function ApiUpdateDeployment() {
  return applyDecorators(
    ApiOperation({ summary: 'Update a deployment' }),
    ApiParam({ name: 'id', description: 'Deployment UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: UpdateDeploymentDto }),
    ApiResponse({ status: 200, description: 'Deployment updated successfully.', type: DeploymentDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Deployment not found.' }),
  );
}

export function ApiDeleteDeployment() {
  return applyDecorators(
    ApiOperation({ summary: 'Delete a deployment' }),
    ApiParam({ name: 'id', description: 'Deployment UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Deployment deleted successfully.', type: DeploymentDto }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Deployment not found.' }),
  );
}

export function ApiRemoveDeploymentPlan() {
  return applyDecorators(
    ApiOperation({ summary: 'Remove a plan and industry assignment from a deployment' }),
    ApiParam({ name: 'id', description: 'Deployment UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: AssignDeploymentPlanDto }),
    ApiResponse({ status: 200, description: 'Assignment removed successfully.' }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Deployment not found.' }),
  );
}

export function ApiGetDeploymentPlans() {
  return applyDecorators(
    ApiOperation({ summary: 'Get all plan+industry assignments for a deployment' }),
    ApiParam({ name: 'id', description: 'Deployment UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Assignments retrieved successfully.', type: DeploymentPlanListItemDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Deployment not found.' }),
  );
}

export function ApiGetDeploymentPlanPrices() {
  return applyDecorators(
    ApiOperation({ summary: 'Get plan+industry assignments with prices for a deployment' }),
    ApiParam({ name: 'id', description: 'Deployment UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiResponse({ status: 200, description: 'Plan prices retrieved successfully.', type: DeploymentPlanPriceDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Deployment not found.' }),
  );
}

export function ApiGetDeploymentPlanAssignments() {
  return applyDecorators(
    ApiOperation({
      summary: 'Get deployment plan assignments',
      description: 'Returns all available plans with pricing and assignment status for the deployment.',
    }),
    ApiParam({ name: 'id', type: 'string', format: 'uuid' }),
    ApiResponse({ status: 200, description: 'Plan assignments retrieved.', type: DeploymentPlanAssignmentDto, isArray: true }),
    ApiResponse({ status: 404, description: 'Deployment not found.' }),
  );
}

export function ApiAssignDeploymentPlan() {
  return applyDecorators(
    ApiOperation({ summary: 'Assign a plan and industry to a deployment' }),
    ApiParam({ name: 'id', description: 'Deployment UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiBody({ type: AssignDeploymentPlanDto }),
    ApiResponse({ status: 201, description: 'Assignment created successfully.', type: AssignDeploymentPlanResponseDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
    ApiResponse({ status: 404, description: 'Deployment not found.' }),
  );
}
