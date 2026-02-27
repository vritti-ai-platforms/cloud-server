import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import { IndustryDto } from '../dto/entity/industry.dto';
import type { CreateIndustryDto } from '../dto/request/create-industry.dto';
import type { UpdateIndustryDto } from '../dto/request/update-industry.dto';
import { IndustryRepository } from '../repositories/industry.repository';

@Injectable()
export class IndustryService {
  private readonly logger = new Logger(IndustryService.name);

  constructor(private readonly industryRepository: IndustryRepository) {}

  // Creates a new industry; throws ConflictException on duplicate code or slug
  async create(dto: CreateIndustryDto): Promise<IndustryDto> {
    const existingCode = await this.industryRepository.findByCode(dto.code);
    if (existingCode) {
      throw new ConflictException({
        label: 'Code Already Exists',
        detail: 'An industry with this code already exists. Please choose a different code.',
        errors: [{ field: 'code', message: 'Duplicate code' }],
      });
    }
    const existingSlug = await this.industryRepository.findBySlug(dto.slug);
    if (existingSlug) {
      throw new ConflictException({
        label: 'Slug Already Exists',
        detail: 'An industry with this slug already exists. Please choose a different slug.',
        errors: [{ field: 'slug', message: 'Duplicate slug' }],
      });
    }
    const industry = await this.industryRepository.create(dto);
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

  // Updates an industry by ID; throws NotFoundException if not found, ConflictException on duplicate code or slug
  async update(id: string, dto: UpdateIndustryDto): Promise<IndustryDto> {
    const existing = await this.industryRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Industry not found.');
    }
    if (dto.code) {
      const existingCode = await this.industryRepository.findByCode(dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException({
          label: 'Code Already Exists',
          detail: 'An industry with this code already exists. Please choose a different code.',
          errors: [{ field: 'code', message: 'Duplicate code' }],
        });
      }
    }
    if (dto.slug) {
      const existingSlug = await this.industryRepository.findBySlug(dto.slug);
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException({
          label: 'Slug Already Exists',
          detail: 'An industry with this slug already exists. Please choose a different slug.',
          errors: [{ field: 'slug', message: 'Duplicate slug' }],
        });
      }
    }
    const industry = await this.industryRepository.update(id, dto);
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
}
