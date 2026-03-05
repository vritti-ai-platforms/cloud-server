import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@vritti/api-sdk';
import { RegionRepository } from '@/modules/admin-api/region/repositories/region.repository';
import { RegionProviderRepository } from '@/modules/admin-api/region/repositories/region-provider.repository';
import type { ProviderOptionDto } from '../dto/response/provider-option.dto';
import type { RegionOptionDto } from '../dto/response/region-option.dto';

@Injectable()
export class RegionService {
  constructor(
    private readonly regionRepository: RegionRepository,
    private readonly regionProviderRepository: RegionProviderRepository,
  ) {}

  // Returns all regions as lightweight option DTOs
  async findAll(): Promise<RegionOptionDto[]> {
    const regions = await this.regionRepository.findAll();
    return regions.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      state: r.state,
      city: r.city,
    }));
  }

  // Returns cloud providers assigned to a region; throws NotFoundException if region missing
  async getCloudProviders(regionId: string): Promise<ProviderOptionDto[]> {
    const region = await this.regionRepository.findById(regionId);
    if (!region) throw new NotFoundException('Region not found.');
    const providers = await this.regionProviderRepository.findProvidersByRegionId(regionId);
    return providers.map((p) => ({ id: p.id, name: p.name, code: p.code }));
  }
}
