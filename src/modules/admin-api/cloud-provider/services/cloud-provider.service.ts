import { Injectable, Logger } from '@nestjs/common';
import {
  ConflictException,
  DataTableStateService,
  type FieldMap,
  FilterProcessor,
  NotFoundException,
  type SelectQueryResult,
  SuccessResponseDto,
} from '@vritti/api-sdk';
import { and, eq } from '@vritti/api-sdk/drizzle-orm';
import { cloudProviders, regionCloudProviders } from '@/db/schema';
import { CloudProviderDto } from '../dto/entity/cloud-provider.dto';
import type { CloudProviderSelectQueryDto } from '../dto/request/cloud-provider-select-query.dto';
import type { CreateCloudProviderDto } from '../dto/request/create-cloud-provider.dto';
import type { UpdateCloudProviderDto } from '../dto/request/update-cloud-provider.dto';
import { CloudProviderTableResponseDto } from '../dto/response/cloud-providers-response.dto';
import { CloudProviderRepository } from '../repositories/cloud-provider.repository';

@Injectable()
export class CloudProviderService {
  private readonly logger = new Logger(CloudProviderService.name);

  private static readonly FIELD_MAP: FieldMap = {
    name: { column: cloudProviders.name, type: 'string' },
    code: { column: cloudProviders.code, type: 'string' },
  };

  constructor(
    private readonly cloudProviderRepository: CloudProviderRepository,
    private readonly dataTableStateService: DataTableStateService,
  ) {}

  // Returns paginated cloud provider options for the select component, optionally filtered by region
  findForSelect(query: CloudProviderSelectQueryDto): Promise<SelectQueryResult> {
    return this.cloudProviderRepository.findForSelect({
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
      ...(query.regionId
        ? {
            joins: [{ table: regionCloudProviders, on: eq(regionCloudProviders.providerId, cloudProviders.id), type: 'inner' as const }],
            conditions: [eq(regionCloudProviders.regionId, query.regionId)],
          }
        : {}),
    });
  }

  // Creates a new cloud provider; throws ConflictException on duplicate code
  async create(dto: CreateCloudProviderDto): Promise<SuccessResponseDto> {
    const existing = await this.cloudProviderRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Provider with this code already exists.');
    }
    const provider = await this.cloudProviderRepository.create(dto);
    this.logger.log(`Created provider: ${provider.name} (${provider.id})`);
    return { success: true, message: 'Cloud provider created successfully.' };
  }

  // Returns paginated cloud providers with region counts, applying server-stored filter/sort/search/pagination state
  async findForTable(userId: string): Promise<CloudProviderTableResponseDto> {
    const { state, activeViewId } = await this.dataTableStateService.getCurrentState(userId, 'cloud-providers');
    const filterWhere = FilterProcessor.buildWhere(state.filters, CloudProviderService.FIELD_MAP);
    const searchWhere = FilterProcessor.buildSearch(state.search, CloudProviderService.FIELD_MAP);
    const where = and(filterWhere, searchWhere);
    const orderBy = FilterProcessor.buildOrderBy(state.sort, CloudProviderService.FIELD_MAP);
    const { limit = 20, offset = 0 } = state.pagination ?? {};
    const { rows, total } = await this.cloudProviderRepository.findAllWithCounts(where, orderBy, limit, offset);
    const result = rows.map((provider) =>
      CloudProviderDto.from(provider, provider.regionCount, provider.deploymentCount),
    );
    return { result, count: total, state, activeViewId };
  }

  // Finds a cloud provider by ID; throws NotFoundException if not found
  async findById(id: string): Promise<CloudProviderDto> {
    const provider = await this.cloudProviderRepository.findById(id);
    if (!provider) {
      throw new NotFoundException('Provider not found.');
    }
    return CloudProviderDto.from(provider);
  }

  // Updates a cloud provider by ID; throws NotFoundException if not found
  async update(id: string, dto: UpdateCloudProviderDto): Promise<SuccessResponseDto> {
    const existing = await this.cloudProviderRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Provider not found.');
    }

    if (dto.code) {
      const existingCode = await this.cloudProviderRepository.findByCode(dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException('Provider with this code already exists.');
      }
    }

    const provider = await this.cloudProviderRepository.update(id, dto);
    this.logger.log(`Updated provider: ${provider.name} (${provider.id})`);
    return { success: true, message: 'Cloud provider updated successfully.' };
  }

  // Deletes a cloud provider by ID; throws NotFoundException if not found, ConflictException if referenced
  async delete(id: string): Promise<SuccessResponseDto> {
    const row = await this.cloudProviderRepository.findOneWithCounts(id);
    if (!row) {
      throw new NotFoundException('Provider not found.');
    }
    const parts: string[] = [];
    if (row.regionCount > 0) parts.push(`${row.regionCount} region${row.regionCount > 1 ? 's' : ''}`);
    if (row.deploymentCount > 0) parts.push(`${row.deploymentCount} deployment${row.deploymentCount > 1 ? 's' : ''}`);
    if (parts.length > 0) {
      throw new ConflictException({
        label: 'Provider In Use',
        detail: `Cannot delete "${row.name}" — it is referenced by ${parts.join(', ')}. Remove those references first.`,
      });
    }
    await this.cloudProviderRepository.delete(id);
    this.logger.log(`Deleted provider: ${row.name} (${row.id})`);
    return { success: true, message: 'Cloud provider deleted successfully.' };
  }
}
