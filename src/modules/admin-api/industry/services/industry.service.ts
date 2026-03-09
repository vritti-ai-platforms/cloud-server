import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, FilterProcessor, NotFoundException, SuccessResponseDto, type FieldMap, type FilterCondition } from '@vritti/api-sdk';
import { industries } from '@/db/schema';
import { DataTableStateService } from '@vritti/api-sdk';
import { IndustryDto } from '../dto/entity/industry.dto';
import { IndustryTableResponseDto } from '../dto/response/industries-response.dto';
import type { CreateIndustryDto } from '../dto/request/create-industry.dto';
import type { UpdateIndustryDto } from '../dto/request/update-industry.dto';
import { IndustryRepository } from '../repositories/industry.repository';

@Injectable()
export class IndustryService {
  private readonly logger = new Logger(IndustryService.name);

  private static readonly FIELD_MAP: FieldMap = {
    name: { column: industries.name, type: 'string' },
    code: { column: industries.code, type: 'string' },
    slug: { column: industries.slug, type: 'string' },
  };

  constructor(
    private readonly industryRepository: IndustryRepository,
    private readonly dataTableStateService: DataTableStateService,
  ) {}

  // Creates a new industry; throws ConflictException on duplicate code or slug
  async create(dto: CreateIndustryDto): Promise<SuccessResponseDto> {
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
    return { success: true, message: 'Industry created successfully.' };
  }

  // Returns all industries with server-stored filter/sort/pagination state applied, optionally narrowed by a search param
  async findForTable(userId: string, searchColumn?: string, searchValue?: string): Promise<IndustryTableResponseDto> {
    const { state, activeViewId } = await this.dataTableStateService.getCurrentState(userId, 'industries');
    const filters: FilterCondition[] = [...state.filters];
    if (searchColumn && searchValue && IndustryService.FIELD_MAP[searchColumn]) {
      filters.push({ field: searchColumn, operator: 'contains', value: searchValue });
    }
    const where = FilterProcessor.buildWhere(filters, IndustryService.FIELD_MAP);
    const orderBy = FilterProcessor.buildOrderBy(state.sort, IndustryService.FIELD_MAP);
    const { limit = 20, offset = 0 } = state.pagination ?? {};
    const { result, count } = await this.industryRepository.findAllAndCount({ where, orderBy, limit, offset });
    return { result: result.map(IndustryDto.from), count, state, activeViewId };
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
  async update(id: string, dto: UpdateIndustryDto): Promise<SuccessResponseDto> {
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
    return { success: true, message: 'Industry updated successfully.' };
  }

  // Deletes an industry by ID; throws NotFoundException if not found
  async delete(id: string): Promise<SuccessResponseDto> {
    const industry = await this.industryRepository.delete(id);
    if (!industry) {
      throw new NotFoundException('Industry not found.');
    }
    this.logger.log(`Deleted industry: ${industry.name} (${industry.id})`);
    return { success: true, message: 'Industry deleted successfully.' };
  }
}
