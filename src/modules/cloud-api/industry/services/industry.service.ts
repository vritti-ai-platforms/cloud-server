import { Injectable } from '@nestjs/common';
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
}
