import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, FilterProcessor, NotFoundException, type FieldMap, type FilterCondition } from '@vritti/api-sdk';
import { cloudProviders } from '@/db/schema';
import { TableViewService } from '../../../cloud-api/table-view/services/table-view.service';
import { CloudProviderDto } from '../dto/entity/cloud-provider.dto';
import { CloudProvidersResponseDto } from '../dto/response/cloud-providers-response.dto';
import type { CreateCloudProviderDto } from '../dto/request/create-cloud-provider.dto';
import type { UpdateCloudProviderDto } from '../dto/request/update-cloud-provider.dto';
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
    private readonly tableViewService: TableViewService,
  ) {}

  // Creates a new cloud provider; throws ConflictException on duplicate code
  async create(dto: CreateCloudProviderDto): Promise<CloudProviderDto> {
    const existing = await this.cloudProviderRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Provider with this code already exists.');
    }
    const provider = await this.cloudProviderRepository.create(dto);
    this.logger.log(`Created provider: ${provider.name} (${provider.id})`);
    return CloudProviderDto.from(provider);
  }

  // Returns all cloud providers with region counts, applying server-stored filter/sort state plus an optional search filter
  async findAll(userId: string, searchColumn?: string, searchValue?: string): Promise<CloudProvidersResponseDto> {
    const state = await this.tableViewService.getCurrentState(userId, 'cloud-providers');
    const filters: FilterCondition[] = [...state.filters];
    if (searchColumn && searchValue && CloudProviderService.FIELD_MAP[searchColumn]) {
      filters.push({ field: searchColumn, operator: 'contains', value: searchValue });
    }
    const where = FilterProcessor.buildWhere(filters, CloudProviderService.FIELD_MAP);
    const orderBy = FilterProcessor.buildOrderBy(state.sort, CloudProviderService.FIELD_MAP);
    const providers = await this.cloudProviderRepository.findAllWithCounts(where, orderBy);
    return {
      data: providers.map((provider) => CloudProviderDto.from(provider, provider.regionCount)),
      state,
    };
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
  async update(id: string, dto: UpdateCloudProviderDto): Promise<CloudProviderDto> {
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
    return CloudProviderDto.from(provider);
  }

  // Deletes a cloud provider by ID; throws NotFoundException if not found
  async delete(id: string): Promise<CloudProviderDto> {
    const provider = await this.cloudProviderRepository.delete(id);
    if (!provider) {
      throw new NotFoundException('Provider not found.');
    }

    this.logger.log(`Deleted provider: ${provider.name} (${provider.id})`);
    return CloudProviderDto.from(provider);
  }

  // Converts PostgreSQL unique constraint violations (23505) to ConflictException
}
