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
    const existing = await this.planRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException({
        label: 'Code Already Exists',
        detail: 'A plan with this code already exists. Please choose a different code.',
        errors: [{ field: 'code', message: 'Duplicate code' }],
      });
    }
    const plan = await this.planRepository.create(dto);
    this.logger.log(`Created plan: ${plan.name} (${plan.id})`);
    return PlanDto.from(plan);
  }

  // Returns all plans mapped to DTOs with price counts
  async findAll(): Promise<PlanDto[]> {
    const plans = await this.planRepository.findAllWithCounts();
    return plans.map((plan) => PlanDto.from(plan, plan.priceCount));
  }

  // Finds a plan by ID; throws NotFoundException if not found
  async findById(id: string): Promise<PlanDto> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }
    return PlanDto.from(plan);
  }

  // Updates a plan by ID; throws NotFoundException if not found, ConflictException on duplicate code
  async update(id: string, dto: UpdatePlanDto): Promise<PlanDto> {
    const existing = await this.planRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Plan not found.');
    }
    if (dto.code) {
      const existingCode = await this.planRepository.findByCode(dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException({
          label: 'Code Already Exists',
          detail: 'A plan with this code already exists. Please choose a different code.',
          errors: [{ field: 'code', message: 'Duplicate code' }],
        });
      }
    }
    const plan = await this.planRepository.update(id, dto);
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
}
