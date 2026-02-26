import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import { IndustryDto } from '../dto/entity/industry.dto';
import type { CreateIndustryDto } from '../dto/request/create-industry.dto';
import type { UpdateIndustryDto } from '../dto/request/update-industry.dto';
import { AdminIndustryRepository } from '../repositories/industry.repository';

@Injectable()
export class AdminIndustryService {
  private readonly logger = new Logger(AdminIndustryService.name);

  constructor(private readonly industryRepository: AdminIndustryRepository) {}

  // Creates a new industry; throws ConflictException on duplicate slug
  async create(dto: CreateIndustryDto): Promise<IndustryDto> {
    let industry;
    try {
      industry = await this.industryRepository.create(dto);
    } catch (error) {
      this.handleUniqueConstraintError(error, 'slug', dto.slug);
      throw error;
    }

    this.logger.log(`Created industry: ${industry.name} (${industry.id})`);
    return IndustryDto.from(industry);
  }

  // Returns all industries mapped to DTOs
  async findAll(): Promise<IndustryDto[]> {
    const industries = await this.industryRepository.findAll();
    return industries.map((industry) => IndustryDto.from(industry));
  }

  // Finds an industry by ID; throws NotFoundException if not found
  async findById(id: string): Promise<IndustryDto> {
    const industry = await this.industryRepository.findById(id);
    if (!industry) {
      throw new NotFoundException('Industry not found.');
    }
    return IndustryDto.from(industry);
  }

  // Updates an industry by ID; throws NotFoundException if not found
  async update(id: string, dto: UpdateIndustryDto): Promise<IndustryDto> {
    const existing = await this.industryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Industry not found.');
    }

    let industry;
    try {
      industry = await this.industryRepository.update(id, dto);
    } catch (error) {
      if (dto.slug) {
        this.handleUniqueConstraintError(error, 'slug', dto.slug);
      }
      throw error;
    }

    this.logger.log(`Updated industry: ${industry.name} (${industry.id})`);
    return IndustryDto.from(industry);
  }

  // Deletes an industry by ID; throws NotFoundException if not found
  async delete(id: string): Promise<IndustryDto> {
    const industry = await this.industryRepository.delete(id);
    if (!industry) {
      throw new NotFoundException('Industry not found.');
    }

    this.logger.log(`Deleted industry: ${industry.name} (${industry.id})`);
    return IndustryDto.from(industry);
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
        detail: `An industry with this ${field} already exists. Please choose a different ${field}.`,
        errors: [{ field, message: `Duplicate ${field}` }],
      });
    }
  }
}
