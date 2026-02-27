import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import { RegionDto } from '../dto/entity/region.dto';
import type { AssignProvidersDto } from '../dto/request/assign-providers.dto';
import type { CreateRegionDto } from '../dto/request/create-region.dto';
import type { UpdateRegionDto } from '../dto/request/update-region.dto';
import { AssignProvidersResponseDto } from '../dto/response/assign-providers-response.dto';
import { RegionRepository } from '../repositories/region.repository';
import { RegionProviderRepository } from '../repositories/region-provider.repository';

@Injectable()
export class RegionService {
  private readonly logger = new Logger(RegionService.name);

  constructor(
    private readonly regionRepository: RegionRepository,
    private readonly regionProviderRepository: RegionProviderRepository,
  ) {}

  // Creates a new region; throws ConflictException on duplicate code
  async create(dto: CreateRegionDto): Promise<RegionDto> {
    const existing = await this.regionRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Region with this code already exists.');
    }
    const region = await this.regionRepository.create(dto);
    this.logger.log(`Created region: ${region.name} (${region.id})`);
    return RegionDto.from(region);
  }

  // Returns all regions mapped to DTOs with provider counts
  async findAll(): Promise<RegionDto[]> {
    const regions = await this.regionRepository.findAllWithCounts();
    return regions.map((region) => RegionDto.from(region, region.providerCount));
  }

  // Finds a region by ID; throws NotFoundException if not found
  async findById(id: string): Promise<RegionDto> {
    const region = await this.regionRepository.findById(id);
    if (!region) {
      throw new NotFoundException('Region not found.');
    }
    return RegionDto.from(region);
  }

  // Updates a region by ID; throws NotFoundException if not found, ConflictException on duplicate code
  async update(id: string, dto: UpdateRegionDto): Promise<RegionDto> {
    const existing = await this.regionRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Region not found.');
    }

    if (dto.code) {
      const existingCode = await this.regionRepository.findByCode(dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException('Region with this code already exists.');
      }
    }

    const region = await this.regionRepository.update(id, dto);
    this.logger.log(`Updated region: ${region.name} (${region.id})`);
    return RegionDto.from(region);
  }

  // Deletes a region by ID; throws NotFoundException if not found
  async delete(id: string): Promise<RegionDto> {
    const region = await this.regionRepository.delete(id);
    if (!region) {
      throw new NotFoundException('Region not found.');
    }
    this.logger.log(`Deleted region: ${region.name} (${region.id})`);
    return RegionDto.from(region);
  }

  // Bulk-assigns cloud providers to a region; throws NotFoundException if region missing
  async assignCloudProviders(regionId: string, dto: AssignProvidersDto): Promise<AssignProvidersResponseDto> {
    const region = await this.regionRepository.findById(regionId);
    if (!region) throw new NotFoundException('Region not found.');
    const assigned = await this.regionProviderRepository.bulkInsert(regionId, dto.cloudProviderIds);
    this.logger.log(`Assigned ${assigned} cloud providers to region ${regionId}`);
    return { assigned };
  }
}
