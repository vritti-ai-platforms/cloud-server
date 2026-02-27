import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import { ProviderDto } from '../dto/entity/provider.dto';
import type { CreateProviderDto } from '../dto/request/create-provider.dto';
import type { UpdateProviderDto } from '../dto/request/update-provider.dto';
import { ProviderRepository } from '../repositories/provider.repository';

@Injectable()
export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);

  constructor(private readonly providerRepository: ProviderRepository) {}

  // Creates a new provider; throws ConflictException on duplicate code
  async create(dto: CreateProviderDto): Promise<ProviderDto> {
    const existing = await this.providerRepository.findByCode(dto.code);
    if (existing) {
      throw new ConflictException('Provider with this code already exists.');
    }
    const provider = await this.providerRepository.create(dto);
    this.logger.log(`Created provider: ${provider.name} (${provider.id})`);
    return ProviderDto.from(provider);
  }

  // Returns all providers mapped to DTOs with region counts
  async findAll(): Promise<ProviderDto[]> {
    const providers = await this.providerRepository.findAllWithCounts();
    return providers.map((provider) => ProviderDto.from(provider, provider.regionCount));
  }

  // Finds a provider by ID; throws NotFoundException if not found
  async findById(id: string): Promise<ProviderDto> {
    const provider = await this.providerRepository.findById(id);
    if (!provider) {
      throw new NotFoundException('Provider not found.');
    }
    return ProviderDto.from(provider);
  }

  // Updates a provider by ID; throws NotFoundException if not found
  async update(id: string, dto: UpdateProviderDto): Promise<ProviderDto> {
    const existing = await this.providerRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Provider not found.');
    }

    if (dto.code) {
      const existingCode = await this.providerRepository.findByCode(dto.code);
      if (existingCode && existingCode.id !== id) {
        throw new ConflictException('Provider with this code already exists.');
      }
    }

    const provider = await this.providerRepository.update(id, dto);
    this.logger.log(`Updated provider: ${provider.name} (${provider.id})`);
    return ProviderDto.from(provider);
  }

  // Deletes a provider by ID; throws NotFoundException if not found
  async delete(id: string): Promise<ProviderDto> {
    const provider = await this.providerRepository.delete(id);
    if (!provider) {
      throw new NotFoundException('Provider not found.');
    }

    this.logger.log(`Deleted provider: ${provider.name} (${provider.id})`);
    return ProviderDto.from(provider);
  }

  // Converts PostgreSQL unique constraint violations (23505) to ConflictException
}
