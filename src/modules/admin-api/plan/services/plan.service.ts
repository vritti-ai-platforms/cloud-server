import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import { PlanDto } from '../dto/entity/plan.dto';
import type { CreatePlanDto } from '../dto/request/create-plan.dto';
import type { UpdatePlanDto } from '../dto/request/update-plan.dto';
import { PlanRepository } from '../repositories/plan.repository';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(private readonly planRepository: PlanRepository) {}

  // Creates a new plan; throws ConflictException on duplicate code
  async create(dto: CreatePlanDto): Promise<PlanDto> {
    let plan;
    try {
      plan = await this.planRepository.create(dto);
    } catch (error) {
      this.handleUniqueConstraintError(error, 'code', dto.code);
      throw error;
    }

    this.logger.log(`Created plan: ${plan.name} (${plan.id})`);
    return PlanDto.from(plan);
  }

  // Returns all plans mapped to DTOs
  async findAll(): Promise<PlanDto[]> {
    const plans = await this.planRepository.findAll();
    return plans.map((plan) => PlanDto.from(plan));
  }

  // Finds a plan by ID; throws NotFoundException if not found
  async findById(id: string): Promise<PlanDto> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }
    return PlanDto.from(plan);
  }

  // Updates a plan by ID; throws NotFoundException if not found
  async update(id: string, dto: UpdatePlanDto): Promise<PlanDto> {
    const existing = await this.planRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Plan not found.');
    }

    let plan;
    try {
      plan = await this.planRepository.update(id, dto);
    } catch (error) {
      if (dto.code) {
        this.handleUniqueConstraintError(error, 'code', dto.code);
      }
      throw error;
    }

    this.logger.log(`Updated plan: ${plan.name} (${plan.id})`);
    return PlanDto.from(plan);
  }

  // Deletes a plan by ID; throws NotFoundException if not found
  async delete(id: string): Promise<PlanDto> {
    const plan = await this.planRepository.delete(id);
    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }

    this.logger.log(`Deleted plan: ${plan.name} (${plan.id})`);
    return PlanDto.from(plan);
  }

  // Converts PostgreSQL unique constraint violations (23505) to ConflictException
  private handleUniqueConstraintError(error: unknown, field: string, value: string): void {
    if (
      error instanceof Error &&
      'code' in error &&
      (error as Error & { code: string }).code === '23505'
    ) {
      throw new ConflictException({
        label: 'Already Exists',
        detail: `A plan with this ${field} already exists. Please choose a different ${field}.`,
        errors: [{ field, message: `Duplicate ${field}` }],
      });
    }
  }
}
