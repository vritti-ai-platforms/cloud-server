import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { DeploymentOptionDto } from '../dto/response/deployment-option.dto';
import { PlanOptionDto } from '../dto/response/plan-option.dto';

export function ApiGetDeployments() {
  return applyDecorators(
    ApiOperation({ summary: 'List active deployments for a region, cloud provider, and industry' }),
    ApiQuery({ name: 'regionId', description: 'Region UUID', required: true }),
    ApiQuery({ name: 'cloudProviderId', description: 'Cloud provider UUID', required: true }),
    ApiQuery({ name: 'industryId', description: 'Industry UUID', required: true }),
    ApiResponse({ status: 200, description: 'Deployments retrieved successfully.', type: DeploymentOptionDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}

export function ApiGetDeploymentPlans() {
  return applyDecorators(
    ApiOperation({ summary: 'List plans for a deployment and industry with pricing' }),
    ApiParam({ name: 'id', description: 'Deployment UUID', example: '550e8400-e29b-41d4-a716-446655440000' }),
    ApiQuery({ name: 'industryId', description: 'Industry UUID', required: false }),
    ApiResponse({ status: 200, description: 'Plans retrieved successfully.', type: PlanOptionDto, isArray: true }),
    ApiResponse({ status: 401, description: 'Unauthorized.' }),
  );
}
