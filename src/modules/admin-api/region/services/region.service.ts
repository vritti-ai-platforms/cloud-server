import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import { RegionDto } from '../dto/entity/region.dto';
import type { CreateRegionDto } from '../dto/request/create-region.dto';
import type { UpdateRegionDto } from '../dto/request/update-region.dto';
import { RegionRepository } from '../repositories/region.repository';

@Injectable()
export class RegionService {
  private readonly logger = new Logger(RegionService.name);

  constructor(private readonly regionRepository: RegionRepository) {}

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

  // Returns all regions mapped to DTOs
  async findAll(): Promise<RegionDto[]> {
    const regions = await this.regionRepository.findAll();
    return regions.map((region) => RegionDto.from(region));
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

  // Converts PostgreSQL unique constraint violations (23505) to ConflictException
  private handleUniqueConstraintError(error: unknown, field: string, value: string): never {
    const pg = error as { code?: string };
    if (pg.code === '23505') {
      throw new ConflictException(`Region with ${field} '${value}' already exists.`);
    }
    throw error;
  }
}
