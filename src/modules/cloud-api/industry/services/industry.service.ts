import { Injectable } from '@nestjs/common';
import { SelectOptionsQueryDto, type SelectQueryResult } from '@vritti/api-sdk';
import { IndustryDto } from '../dto/entity/industry.dto';
import { IndustryRepository } from '../repositories/industry.repository';

@Injectable()
export class IndustryService {
  constructor(private readonly industryRepository: IndustryRepository) {}

  // Returns all industries mapped to IndustryDto
  async findAll(): Promise<IndustryDto[]> {
    const industries = await this.industryRepository.findAll();
    return industries.map((industry) => IndustryDto.from(industry));
  }

  // Returns paginated industry options for select component
  findForSelect(query: SelectOptionsQueryDto): Promise<SelectQueryResult> {
    return this.industryRepository.findForSelect({
      value: query.valueKey || 'id',
      label: query.labelKey || 'name',
      description: query.descriptionKey,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
      values: query.values,
      excludeIds: query.excludeIds,
      orderBy: { name: 'asc' },
    });
  }
}
