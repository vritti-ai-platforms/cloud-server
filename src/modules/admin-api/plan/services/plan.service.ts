import { Injectable, Logger } from '@nestjs/common';
import {
  ConflictException,
  NotFoundException,
  SelectOptionsQueryDto,
  type SelectQueryResult,
  SuccessResponseDto,
} from '@vritti/api-sdk';
import { PlanDto } from '../dto/entity/plan.dto';
import type { CreatePlanDto } from '../dto/request/create-plan.dto';
import type { UpdatePlanDto } from '../dto/request/update-plan.dto';
import { PlansResponseDto } from '../dto/response/plans-response.dto';
import { PlanRepository } from '../repositories/plan.repository';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(private readonly planRepository: PlanRepository) {}

  // Returns paginated plan options for the select component
  findForSelect(query: SelectOptionsQueryDto): Promise<SelectQueryResult> {
    return this.planRepository.findForSelect({
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
    });
  }

  // Creates a new plan; throws ConflictException on duplicate code
  async create(dto: CreatePlanDto): Promise<SuccessResponseDto> {
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
    return { success: true, message: 'Plan created successfully.' };
  }

  // Returns all plans mapped to DTOs with price counts
  async findAll(): Promise<PlansResponseDto> {
    const plans = await this.planRepository.findAllWithCounts();
    const result = plans.map((plan) => PlanDto.from(plan, plan.priceCount));
    return { result, count: result.length };
  }

  // Finds a plan by ID with canDelete flag; throws NotFoundException if not found
  async findById(id: string): Promise<PlanDto> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      throw new NotFoundException('Plan not found.');
    }
    const { priceCount, deploymentCount, orgCount } = await this.planRepository.getReferenceCounts(id);
    const canDelete = priceCount === 0 && deploymentCount === 0 && orgCount === 0;
    return PlanDto.from(plan, priceCount, canDelete);
  }

  // Updates a plan by ID; throws NotFoundException if not found, ConflictException on duplicate code
  async update(id: string, dto: UpdatePlanDto): Promise<SuccessResponseDto> {
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
    return { success: true, message: 'Plan updated successfully.' };
  }

  // Deletes a plan by ID; throws NotFoundException if not found, ConflictException if referenced
  async delete(id: string): Promise<SuccessResponseDto> {
    const existing = await this.planRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Plan not found.');
    }
    const referenced = await this.planRepository.isReferenced(id);
    if (referenced) {
      throw new ConflictException({
        label: 'Plan In Use',
        detail: `Cannot delete "${existing.name}" — it has prices or deployment assignments. Remove those first.`,
      });
    }
    await this.planRepository.delete(id);
    this.logger.log(`Deleted plan: ${existing.name} (${existing.id})`);
    return { success: true, message: 'Plan deleted successfully.' };
  }
}
