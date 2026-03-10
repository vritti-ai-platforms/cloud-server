import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type SelectQueryResult, SuccessResponseDto } from '@vritti/api-sdk';
import { ApiAssignDeploymentPlan, ApiCreateDeployment, ApiDeleteDeployment, ApiFindAllDeployments, ApiFindDeploymentById, ApiFindDeploymentsSelect, ApiGetDeploymentPlanAssignments, ApiGetDeploymentPlanPrices, ApiGetDeploymentPlans, ApiRemoveDeploymentPlan, ApiUpdateDeployment } from '../docs/deployment.docs';
import { DeploymentDto } from '../dto/entity/deployment.dto';
import { DeploymentsResponseDto } from '../dto/response/deployments-response.dto';
import type { DeploymentPlanListItemDto } from '../dto/entity/deployment-plan-list-item.dto';
import type { DeploymentPlanAssignmentDto } from '../dto/entity/deployment-plan-assignment.dto';
import type { DeploymentPlanPriceDto } from '../dto/entity/deployment-plan-price.dto';
import { AssignDeploymentPlanDto } from '../dto/request/assign-deployment-plan.dto';
import { CreateDeploymentDto } from '../dto/request/create-deployment.dto';
import { DeploymentSelectQueryDto } from '../dto/request/deployment-select-query.dto';
import { UpdateDeploymentDto } from '../dto/request/update-deployment.dto';
import { DeploymentService } from '../services/deployment.service';

@ApiTags('Admin - Deployments')
@ApiBearerAuth()
@Controller('deployments')
export class DeploymentController {
  private readonly logger = new Logger(DeploymentController.name);

  constructor(private readonly deploymentService: DeploymentService) {}

  // Creates a new deployment
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateDeployment()
  create(@Body() dto: CreateDeploymentDto): Promise<SuccessResponseDto> {
    this.logger.log('POST /admin-api/deployments');
    return this.deploymentService.create(dto);
  }

  // Returns all deployments
  @Get()
  @ApiFindAllDeployments()
  findAll(): Promise<DeploymentsResponseDto> {
    this.logger.log('GET /admin-api/deployments');
    return this.deploymentService.findAll();
  }

  // Returns paginated deployment options for the select component
  @Get('select')
  @ApiFindDeploymentsSelect()
  findForSelect(@Query() query: DeploymentSelectQueryDto): Promise<SelectQueryResult> {
    this.logger.log('GET /admin-api/deployments/select');
    return this.deploymentService.findForSelect(query);
  }

  // Returns plan+industry assignments with prices for the deployment's region and cloud provider
  @Get(':id/plan-prices')
  @ApiGetDeploymentPlanPrices()
  getPlanPrices(@Param('id') id: string): Promise<DeploymentPlanPriceDto[]> {
    this.logger.log(`GET /admin-api/deployments/${id}/plan-prices`);
    return this.deploymentService.getPlanPrices(id);
  }

  // Returns a single deployment by ID
  @Get(':id')
  @ApiFindDeploymentById()
  findById(@Param('id') id: string): Promise<DeploymentDto> {
    this.logger.log(`GET /admin-api/deployments/${id}`);
    return this.deploymentService.findById(id);
  }

  // Updates a deployment by ID
  @Patch(':id')
  @ApiUpdateDeployment()
  update(@Param('id') id: string, @Body() dto: UpdateDeploymentDto): Promise<SuccessResponseDto> {
    this.logger.log(`PATCH /admin-api/deployments/${id}`);
    return this.deploymentService.update(id, dto);
  }

  // Deletes a deployment by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteDeployment()
  delete(@Param('id') id: string): Promise<SuccessResponseDto> {
    this.logger.log(`DELETE /admin-api/deployments/${id}`);
    return this.deploymentService.delete(id);
  }

  // Returns all available plans with prices and assignment status for the deployment
  @Get(':id/plan-assignments')
  @ApiGetDeploymentPlanAssignments()
  getPlanAssignments(@Param('id') id: string): Promise<DeploymentPlanAssignmentDto[]> {
    this.logger.log(`GET /admin-api/deployments/${id}/plan-assignments`);
    return this.deploymentService.getPlanAssignments(id);
  }

  // Returns all plan+industry assignments for a deployment
  @Get(':id/plans')
  @ApiGetDeploymentPlans()
  getPlans(@Param('id') id: string): Promise<DeploymentPlanListItemDto[]> {
    this.logger.log(`GET /admin-api/deployments/${id}/plans`);
    return this.deploymentService.getPlans(id);
  }

  // Assigns a plan+industry to a deployment
  @Post(':id/plans')
  @HttpCode(HttpStatus.CREATED)
  @ApiAssignDeploymentPlan()
  assignPlan(@Param('id') id: string, @Body() dto: AssignDeploymentPlanDto): Promise<SuccessResponseDto> {
    this.logger.log(`POST /admin-api/deployments/${id}/plans`);
    return this.deploymentService.assignPlan(id, dto);
  }

  // Removes a plan+industry assignment from a deployment
  @Delete(':id/plans')
  @HttpCode(HttpStatus.OK)
  @ApiRemoveDeploymentPlan()
  removePlan(@Param('id') id: string, @Body() dto: AssignDeploymentPlanDto): Promise<SuccessResponseDto> {
    this.logger.log(`DELETE /admin-api/deployments/${id}/plans`);
    return this.deploymentService.removePlan(id, dto);
  }
}
