import { Injectable } from '@nestjs/common';
import type { DeploymentFilterDto, DeploymentPlanQueryDto } from '../dto/request/deployment-filter.dto';
import type { DeploymentOptionDto } from '../dto/response/deployment-option.dto';
import type { PlanOptionDto } from '../dto/response/plan-option.dto';
import { CloudDeploymentRepository } from '../repositories/deployment.repository';

@Injectable()
export class CloudDeploymentService {
  constructor(private readonly cloudDeploymentRepository: CloudDeploymentRepository) {}

  // Returns active deployments for the given region, provider, and industry combo
  findActive(query: DeploymentFilterDto): Promise<DeploymentOptionDto[]> {
    return this.cloudDeploymentRepository.findActive(query.regionId, query.cloudProviderId, query.industryId);
  }

  // Returns plans available on a deployment for the given industry, with price included
  findPlansForDeployment(deploymentId: string, query: DeploymentPlanQueryDto): Promise<PlanOptionDto[]> {
    if (!query.industryId) return Promise.resolve([]);
    return this.cloudDeploymentRepository.findPlansForDeployment(deploymentId, query.industryId);
  }
}
