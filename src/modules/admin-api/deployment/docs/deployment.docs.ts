import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { DeploymentDto } from '../dto/entity/deployment.dto';
import { AssignDeploymentPlanDto } from '../dto/request/assign-deployment-plan.dto';
import { CreateDeploymentDto } from '../dto/request/create-deployment.dto';
import { UpdateDeploymentDto } from '../dto/request/update-deployment.dto';
import { AssignDeploymentPlanResponseDto } from '../dto/response/assign-deployment-plan-response.dto';

export function ApiCreateDeployment() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a new deployment' }),
    ApiBody({ type: CreateDeploymentDto }),
    ApiResponse({ status: 201, description: 'Deployment created successfully.', type: DeploymentDto }),
    ApiResponse({ status: 400, description: 'Validation failed.' }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiFindAllDeployments() {
  return applyDecorators(
    ApiOperation({ summary: 'List all deployments' }),
    ApiResponse({ status: 200, description: 'Deployments retrieved successfully.', type: DeploymentDto, isArray: true }),
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
