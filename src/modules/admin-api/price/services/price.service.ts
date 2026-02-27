import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@vritti/api-sdk';
import { PriceDto } from '../dto/entity/price.dto';
import type { CreatePriceDto } from '../dto/request/create-price.dto';
import type { UpdatePriceDto } from '../dto/request/update-price.dto';
import { PriceRepository } from '../repositories/price.repository';

@Injectable()
export class PriceService {
  private readonly logger = new Logger(PriceService.name);

  constructor(private readonly priceRepository: PriceRepository) {}

  // Creates a new price entry; catches FK violations and returns a clear error
  async create(dto: CreatePriceDto): Promise<PriceDto> {
    let price;
    try {
      price = await this.priceRepository.create(dto);
    } catch (error) {
      this.handleFkViolation(error);
      throw error;
    }
    this.logger.log(`Created price: ${price.id}`);
    return PriceDto.from(price);
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

  // Returns all prices for a given plan
  async findByPlanId(planId: string): Promise<PriceDto[]> {
    const prices = await this.priceRepository.findByPlanId(planId);
    return prices.map((price) => PriceDto.from(price));
  }

  // Updates a price by ID; throws NotFoundException if not found
  async update(id: string, dto: UpdatePriceDto): Promise<PriceDto> {
    const existing = await this.priceRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Price not found.');
    }
    let price;
    try {
      price = await this.priceRepository.update(id, dto);
    } catch (error) {
      this.handleFkViolation(error);
      throw error;
    }
    this.logger.log(`Updated price: ${price.id}`);
    return PriceDto.from(price);
  }

  // Deletes a price by ID; throws NotFoundException if not found
  async delete(id: string): Promise<PriceDto> {
    const price = await this.priceRepository.delete(id);
    if (!price) {
      throw new NotFoundException('Price not found.');
    }
    this.logger.log(`Deleted price: ${price.id}`);
    return PriceDto.from(price);
  }

  // Converts PostgreSQL FK violation (23503) to BadRequestException
  private handleFkViolation(error: unknown): void {
    const pg = error as { code?: string };
    if (pg.code === '23503') {
      throw new BadRequestException({
        label: 'Invalid Reference',
        detail: 'One or more of the provided IDs (plan, industry, region, provider) do not exist.',
      });
    }
  }
}
