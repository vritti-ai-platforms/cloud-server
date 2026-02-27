import { Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@vritti/api-sdk';
import { CloudProviderDto } from '../dto/entity/cloud-provider.dto';
import type { CreateCloudProviderDto } from '../dto/request/create-cloud-provider.dto';
import type { UpdateCloudProviderDto } from '../dto/request/update-cloud-provider.dto';
import { CloudProviderRepository } from '../repositories/cloud-provider.repository';

@Injectable()
export class CloudProviderService {
  private readonly logger = new Logger(CloudProviderService.name);

  constructor(private readonly cloudProviderRepository: CloudProviderRepository) {}

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

  // Returns all cloud providers mapped to DTOs with region counts
  async findAll(): Promise<CloudProviderDto[]> {
    const providers = await this.cloudProviderRepository.findAllWithCounts();
    return providers.map((provider) => CloudProviderDto.from(provider, provider.regionCount));
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
