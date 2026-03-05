import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiGetDeploymentPlans, ApiGetDeployments } from '../docs/deployment.docs';
import { DeploymentFilterDto, DeploymentPlanQueryDto } from '../dto/request/deployment-filter.dto';
import type { DeploymentOptionDto } from '../dto/response/deployment-option.dto';
import type { PlanOptionDto } from '../dto/response/plan-option.dto';
import { CloudDeploymentService } from '../services/deployment.service';

@ApiTags('Deployments')
@ApiBearerAuth()
@Controller('deployments')
export class CloudDeploymentController {
  private readonly logger = new Logger(CloudDeploymentController.name);

  constructor(private readonly cloudDeploymentService: CloudDeploymentService) {}

  // Returns active deployments for the given region, provider, and industry
  @Get()
  @ApiGetDeployments()
  findActive(@Query() query: DeploymentFilterDto): Promise<DeploymentOptionDto[]> {
    this.logger.log('GET /cloud-api/deployments');
    return this.cloudDeploymentService.findActive(query);
  }

  // Returns plans assigned to a deployment for the given industry, with price info
  @Get(':id/plans')
  @ApiGetDeploymentPlans()
  getPlans(@Param('id') id: string, @Query() query: DeploymentPlanQueryDto): Promise<PlanOptionDto[]> {
    this.logger.log(`GET /cloud-api/deployments/${id}/plans`);
    return this.cloudDeploymentService.findPlansForDeployment(id, query);
  }
}
