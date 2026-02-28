import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException } from '@vritti/api-sdk';
import { DeploymentDto } from '../dto/entity/deployment.dto';
import type { AssignDeploymentPlanDto } from '../dto/request/assign-deployment-plan.dto';
import type { CreateDeploymentDto } from '../dto/request/create-deployment.dto';
import type { UpdateDeploymentDto } from '../dto/request/update-deployment.dto';
import { AssignDeploymentPlanResponseDto } from '../dto/response/assign-deployment-plan-response.dto';
import { DeploymentIndustryPlanRepository } from '../repositories/deployment-industry-plan.repository';
import { DeploymentRepository } from '../repositories/deployment.repository';

@Injectable()
export class DeploymentService {
  private readonly logger = new Logger(DeploymentService.name);

  constructor(
    private readonly deploymentRepository: DeploymentRepository,
    private readonly deploymentIndustryPlanRepository: DeploymentIndustryPlanRepository,
  ) {}

  // Creates a new deployment
  async create(dto: CreateDeploymentDto): Promise<DeploymentDto> {
    const deployment = await this.deploymentRepository.create(dto);
    this.logger.log(`Created deployment: ${deployment.name} (${deployment.id})`);
    return DeploymentDto.from(deployment);
  }

  // Returns all deployments mapped to DTOs
  async findAll(): Promise<DeploymentDto[]> {
    const deployments = await this.deploymentRepository.findAll();
    return deployments.map((deployment) => DeploymentDto.from(deployment));
  }

  // Finds a deployment by ID; throws NotFoundException if not found
  async findById(id: string): Promise<DeploymentDto> {
    const deployment = await this.deploymentRepository.findById(id);
    if (!deployment) {
      throw new NotFoundException('Deployment not found.');
    }
    return DeploymentDto.from(deployment);
  }

  // Updates a deployment by ID; throws NotFoundException if not found
  async update(id: string, dto: UpdateDeploymentDto): Promise<DeploymentDto> {
    const existing = await this.deploymentRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Deployment not found.');
    }

    const deployment = await this.deploymentRepository.update(id, dto);
    this.logger.log(`Updated deployment: ${deployment.name} (${deployment.id})`);
    return DeploymentDto.from(deployment);
  }

  // Deletes a deployment by ID; throws NotFoundException if not found
  async delete(id: string): Promise<DeploymentDto> {
    const deployment = await this.deploymentRepository.delete(id);
    if (!deployment) {
      throw new NotFoundException('Deployment not found.');
    }

    this.logger.log(`Deleted deployment: ${deployment.name} (${deployment.id})`);
    return DeploymentDto.from(deployment);
  }

  // Assigns a plan+industry combination to a deployment; throws NotFoundException if deployment missing
  async assignPlan(deploymentId: string, dto: AssignDeploymentPlanDto): Promise<AssignDeploymentPlanResponseDto> {
    const deployment = await this.deploymentRepository.findById(deploymentId);
    if (!deployment) throw new NotFoundException('Deployment not found.');
    const assigned = await this.deploymentIndustryPlanRepository.insert(deploymentId, dto.planId, dto.industryId);
    this.logger.log(`Assigned plan ${dto.planId} + industry ${dto.industryId} to deployment ${deploymentId}`);
    return { assigned };
  }

  // Removes a plan+industry assignment from a deployment; throws NotFoundException if deployment missing
  async removePlan(deploymentId: string, dto: AssignDeploymentPlanDto): Promise<void> {
    const deployment = await this.deploymentRepository.findById(deploymentId);
    if (!deployment) throw new NotFoundException('Deployment not found.');
    await this.deploymentIndustryPlanRepository.remove(deploymentId, dto.planId, dto.industryId);
    this.logger.log(`Removed plan ${dto.planId} + industry ${dto.industryId} from deployment ${deploymentId}`);
  }
}
