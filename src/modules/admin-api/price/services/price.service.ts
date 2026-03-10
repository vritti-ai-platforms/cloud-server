import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, DataTableStateService, type FieldMap, FilterProcessor, NotFoundException, SuccessResponseDto } from '@vritti/api-sdk';
import { and } from '@vritti/api-sdk/drizzle-orm';
import { cloudProviders, prices, regions } from '@/db/schema';
import { PriceDto } from '../dto/entity/price.dto';
import { PriceDetailDto } from '../dto/entity/price-detail.dto';
import type { CreatePriceDto } from '../dto/request/create-price.dto';
import type { UpdatePriceDto } from '../dto/request/update-price.dto';
import { PricesTableResponseDto } from '../dto/response/prices-table-response.dto';
import { PriceRepository } from '../repositories/price.repository';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  private static readonly FIELD_MAP: FieldMap = {
    regionId: { column: prices.regionId, type: 'uuid' },
    providerId: { column: prices.providerId, type: 'uuid' },
    currency: { column: prices.currency, type: 'string' },
    regionName: { column: regions.name, type: 'string' },
    providerName: { column: cloudProviders.name, type: 'string' },
  };

  constructor(
    private readonly priceRepository: PriceRepository,
    private readonly dataTableStateService: DataTableStateService,
  ) {}

  // Creates a new price, rejecting duplicate plan+industry+region+provider combinations
  async create(dto: CreatePriceDto): Promise<SuccessResponseDto> {
    const existing = await this.priceRepository.findByComposite(dto.planId, dto.industryId, dto.regionId, dto.providerId);
    if (existing) {
      throw new ConflictException({
        label: 'Price Already Exists',
        detail: 'A price for this plan, industry, region, and provider combination already exists.',
      });
    }
    const price = await this.priceRepository.create(dto);
    this.logger.log(`Created price: ${price.id}`);
    return { success: true, message: 'Price created successfully.' };
  }

  // Returns all prices mapped to DTOs
  async findAll(): Promise<PriceDto[]> {
    const prices = await this.priceRepository.findAll();
    return prices.map((price) => PriceDto.from(price));
  }

  // Finds a price by ID; throws NotFoundException if not found
  async findById(id: string): Promise<PriceDto> {
    const price = await this.priceRepository.findById(id);
    if (!price) {
      throw new NotFoundException('Price not found.');
    }
    return PriceDto.from(price);
  }

  // Returns all prices for a given plan with joined region and provider names
  async findByPlanId(planId: string): Promise<PriceDetailDto[]> {
    const prices = await this.priceRepository.findByPlanIdWithRelations(planId);
    return prices.map((row) => PriceDetailDto.fromWithRelations(row));
  }

  // Returns paginated prices for a plan applying stored filter/sort/search/pagination state
  async findForTable(userId: string, planId: string): Promise<PricesTableResponseDto> {
    const { state, activeViewId } = await this.dataTableStateService.getCurrentState(userId, `prices-${planId}`);
    const filterWhere = FilterProcessor.buildWhere(state.filters, PriceService.FIELD_MAP);
    const searchWhere = FilterProcessor.buildSearch(state.search, PriceService.FIELD_MAP);
    const where = and(filterWhere, searchWhere);
    const orderBy = FilterProcessor.buildOrderBy(state.sort, PriceService.FIELD_MAP);
    const { limit = 20, offset = 0 } = state.pagination ?? {};
    const { rows, total } = await this.priceRepository.findByPlanIdWithFilters(planId, where, orderBy, limit, offset);
    const result = rows.map((row) => PriceDetailDto.fromWithRelations(row));
    return { result, count: total, state, activeViewId };
  }

  // Updates a price by ID; throws NotFoundException if not found
  async update(id: string, dto: UpdatePriceDto): Promise<SuccessResponseDto> {
    const existing = await this.priceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Price not found.');
    }
    const price = await this.priceRepository.update(id, dto);
    this.logger.log(`Updated price: ${price.id}`);
    return { success: true, message: 'Price updated successfully.' };
  }

  // Deletes a price by ID; throws NotFoundException if not found
  async delete(id: string): Promise<SuccessResponseDto> {
    const existing = await this.priceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Price not found.');
    }
    await this.priceRepository.delete(id);
    this.logger.log(`Deleted price: ${id}`);
    return { success: true, message: 'Price deleted successfully.' };
  }
}
