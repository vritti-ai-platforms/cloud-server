import { Injectable, Logger } from '@nestjs/common';
import { and } from '@vritti/api-sdk/drizzle-orm';
import { ConflictException, FilterProcessor, NotFoundException, SuccessResponseDto, type FieldMap } from '@vritti/api-sdk';
import { regions } from '@/db/schema';
import { TableViewService } from '../../../cloud-api/table-view/services/table-view.service';
import { RegionDto } from '../dto/entity/region.dto';
import type { AssignProvidersDto } from '../dto/request/assign-providers.dto';
import type { CreateRegionDto } from '../dto/request/create-region.dto';
import type { UpdateRegionDto } from '../dto/request/update-region.dto';
import { AssignProvidersResponseDto } from '../dto/response/assign-providers-response.dto';
import { RegionCloudProviderDto } from '../dto/response/region-cloud-provider.dto';
import { RegionsResponseDto } from '../dto/response/regions-response.dto';
import { RegionRepository } from '../repositories/region.repository';
import { RegionProviderRepository } from '../repositories/region-provider.repository';

@Injectable()
export class RegionService {
  private readonly logger = new Logger(RegionService.name);

  private static readonly FIELD_MAP: FieldMap = {
    name: { column: regions.name, type: 'string' },
    code: { column: regions.code, type: 'string' },
    state: { column: regions.state, type: 'string' },
    city: { column: regions.city, type: 'string' },
    isActive: { column: regions.isActive, type: 'boolean' },
  };

  constructor(
    private readonly regionRepository: RegionRepository,
    private readonly regionProviderRepository: RegionProviderRepository,
    private readonly tableViewService: TableViewService,
  ) {}

  // Creates a new region; throws ConflictException on duplicate code
  async create(dto: CreateRegionDto): Promise<SuccessResponseDto> {
    const existing = await this.regionRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Region with this code already exists.');
    }
    const region = await this.regionRepository.create(dto);
    this.logger.log(`Created region: ${region.name} (${region.id})`);
    return { success: true, message: 'Region created successfully.' };
  }

  // Returns all regions with provider counts, applying server-stored filter/sort/search/provider state
  async findAll(userId: string): Promise<RegionsResponseDto> {
    const { state, activeViewId } = await this.tableViewService.getCurrentState(userId, 'regions');
    const providerFilter = state.filters.find((f) => f.field === 'cloudProviderId' && f.operator === 'equals');
    const standardFilters = state.filters.filter((f) => f.field !== 'cloudProviderId');
    const filterWhere = FilterProcessor.buildWhere(standardFilters, RegionService.FIELD_MAP);
    const searchWhere = FilterProcessor.buildSearch(state.search, RegionService.FIELD_MAP);
    const where = and(filterWhere, searchWhere);
    const orderBy = FilterProcessor.buildOrderBy(state.sort, RegionService.FIELD_MAP);
    const rows = await this.regionRepository.findAllWithCounts(where, orderBy, providerFilter ? String(providerFilter.value) : undefined);
    const result = rows.map((region) => RegionDto.from(region, region.providerCount, region.providers ?? []));
    return { result, count: result.length, state, activeViewId };
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
  async update(id: string, dto: UpdateRegionDto): Promise<SuccessResponseDto> {
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
    return { success: true, message: 'Region updated successfully.' };
  }

  // Deletes a region by ID; throws NotFoundException if not found
  async delete(id: string): Promise<SuccessResponseDto> {
    const region = await this.regionRepository.delete(id);
    if (!region) {
      throw new NotFoundException('Region not found.');
    }
    this.logger.log(`Deleted region: ${region.name} (${region.id})`);
    return { success: true, message: 'Region deleted successfully.' };
  }

  // Bulk-assigns cloud providers to a region; throws NotFoundException if region missing
  async assignCloudProviders(regionId: string, dto: AssignProvidersDto): Promise<AssignProvidersResponseDto> {
    const region = await this.regionRepository.findById(regionId);
    if (!region) throw new NotFoundException('Region not found.');
    const assigned = await this.regionProviderRepository.bulkInsert(regionId, dto.cloudProviderIds);
    this.logger.log(`Assigned ${assigned} cloud providers to region ${regionId}`);
    return { assigned };
  }

  // Returns the cloud providers assigned to a region; throws NotFoundException if region missing
  async getCloudProviders(regionId: string): Promise<RegionCloudProviderDto[]> {
    const region = await this.regionRepository.findById(regionId);
    if (!region) throw new NotFoundException('Region not found.');
    return this.regionProviderRepository.findProvidersByRegionId(regionId);
  }

  // Removes a cloud provider assignment from a region; throws NotFoundException if region missing
  async removeCloudProvider(regionId: string, providerId: string): Promise<void> {
    const region = await this.regionRepository.findById(regionId);
    if (!region) throw new NotFoundException('Region not found.');
    await this.regionProviderRepository.deleteByRegionAndProvider(regionId, providerId);
  }
}
