import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException, type SelectQueryResult, SuccessResponseDto } from '@vritti/api-sdk';
import { and, eq, type SQL } from '@vritti/api-sdk/drizzle-orm';
import { deploymentIndustryPlans } from '@/db/schema';
import { DeploymentDto } from '../dto/entity/deployment.dto';
import type { DeploymentPlanAssignmentDto } from '../dto/entity/deployment-plan-assignment.dto';
import type { AssignDeploymentPlanDto } from '../dto/request/assign-deployment-plan.dto';
import type { CreateDeploymentDto } from '../dto/request/create-deployment.dto';
import type { DeploymentSelectQueryDto } from '../dto/request/deployment-select-query.dto';
import type { UpdateDeploymentDto } from '../dto/request/update-deployment.dto';
import { DeploymentsResponseDto } from '../dto/response/deployments-response.dto';
import { DeploymentRepository } from '../repositories/deployment.repository';
import { DeploymentIndustryPlanRepository } from '../repositories/deployment-industry-plan.repository';

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name);

  constructor(
    private readonly deploymentRepository: DeploymentRepository,
    private readonly deploymentIndustryPlanRepository: DeploymentIndustryPlanRepository,
  ) {}

  // Returns paginated deployment options for the select component, with optional region and cloud provider filters
  findForSelect(query: DeploymentSelectQueryDto): Promise<SelectQueryResult> {
    return this.deploymentRepository.findForSelect({
      value: query.valueKey || 'id',
      label: query.labelKey || 'name',
      description: query.descriptionKey,
      groupId: query.groupIdKey,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
      values: query.values,
      excludeIds: query.excludeIds,
      orderBy: { name: 'asc' },
      where: {
        ...(query.regionId ? { regionId: query.regionId } : {}),
        ...(query.cloudProviderId ? { cloudProviderId: query.cloudProviderId } : {}),
      },
    });
  }

  // Creates a new deployment
  async create(dto: CreateDeploymentDto): Promise<SuccessResponseDto> {
    const deployment = await this.deploymentRepository.create(dto);
    this.logger.log(`Created deployment: ${deployment.name} (${deployment.id})`);
    return { success: true, message: 'Deployment created successfully.' };
  }

  // Returns all deployments mapped to DTOs
  async findAll(): Promise<DeploymentsResponseDto> {
    const deployments = await this.deploymentRepository.findAll();
    const result = deployments.map((deployment) => DeploymentDto.from(deployment));
    return { result, count: result.length };
  }

  // Finds a deployment by ID with organization count; throws NotFoundException if not found
  async findById(id: string): Promise<DeploymentDto> {
    const [deployment, organizationCount] = await Promise.all([
      this.deploymentRepository.findById(id),
      this.deploymentRepository.countOrganizationsByDeploymentId(id),
    ]);
    if (!deployment) {
      throw new NotFoundException('Deployment not found.');
    }
    return DeploymentDto.from(deployment, organizationCount);
  }

  // Updates a deployment by ID; throws NotFoundException if not found
  async update(id: string, dto: UpdateDeploymentDto): Promise<SuccessResponseDto> {
    const existing = await this.deploymentRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Deployment not found.');
    }
    const deployment = await this.deploymentRepository.update(id, dto);
    this.logger.log(`Updated deployment: ${deployment.name} (${deployment.id})`);
    return { success: true, message: 'Deployment updated successfully.' };
  }

  // Deletes a deployment by ID; throws NotFoundException if not found, ConflictException if orgs reference it
  async delete(id: string): Promise<SuccessResponseDto> {
    const existing = await this.deploymentRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Deployment not found.');
    }
    const orgCount = await this.deploymentRepository.countOrganizationsByDeploymentId(id);
    if (orgCount > 0) {
      throw new ConflictException({
        label: 'Deployment In Use',
        detail: `This deployment is used by ${orgCount} organization${orgCount !== 1 ? 's' : ''}. Remove all associated organizations before deleting.`,
      });
    }
    await this.deploymentRepository.delete(id);
    this.logger.log(`Deleted deployment: ${existing.name} (${existing.id})`);
    return { success: true, message: 'Deployment deleted successfully.' };
  }

  // Assigns a plan+industry combination to a deployment; throws NotFoundException if deployment missing
  async assignPlan(deploymentId: string, dto: AssignDeploymentPlanDto): Promise<SuccessResponseDto> {
    const deployment = await this.deploymentRepository.findById(deploymentId);
    if (!deployment) throw new NotFoundException('Deployment not found.');
    await this.deploymentIndustryPlanRepository.create({
      deploymentId,
      planId: dto.planId,
      industryId: dto.industryId,
    });
    this.logger.log(`Assigned plan ${dto.planId} + industry ${dto.industryId} to deployment ${deploymentId}`);
    return { success: true, message: 'Plan assigned successfully.' };
  }

  // Removes a plan+industry assignment from a deployment; throws NotFoundException if deployment missing
  async removePlan(deploymentId: string, dto: AssignDeploymentPlanDto): Promise<SuccessResponseDto> {
    const deployment = await this.deploymentRepository.findById(deploymentId);
    if (!deployment) throw new NotFoundException('Deployment not found.');
    await this.deploymentIndustryPlanRepository.deleteMany(
      and(
        eq(deploymentIndustryPlans.deploymentId, deploymentId),
        eq(deploymentIndustryPlans.planId, dto.planId),
        eq(deploymentIndustryPlans.industryId, dto.industryId),
      ) as SQL,
    );
    this.logger.log(`Removed plan ${dto.planId} + industry ${dto.industryId} from deployment ${deploymentId}`);
    return { success: true, message: 'Plan removed successfully.' };
  }

  // Returns all available plans with prices and assignment status for the deployment
  getPlanAssignments(deploymentId: string): Promise<DeploymentPlanAssignmentDto[]> {
    return this.deploymentIndustryPlanRepository.findPlanAssignmentsForDeployment(deploymentId);
  }
}
