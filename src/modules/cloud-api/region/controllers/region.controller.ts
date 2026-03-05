import { Controller, Get, Logger, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiGetRegionProviders, ApiGetRegions } from '../docs/region.docs';
import type { ProviderOptionDto } from '../dto/response/provider-option.dto';
import type { RegionOptionDto } from '../dto/response/region-option.dto';
import { RegionService } from '../services/region.service';

@ApiTags('Regions')
@ApiBearerAuth()
@Controller('regions')
export class RegionController {
  private readonly logger = new Logger(RegionController.name);

  constructor(private readonly regionService: RegionService) {}

  // Returns all available regions for infrastructure selection
  @Get()
  @ApiGetRegions()
  findAll(): Promise<RegionOptionDto[]> {
    this.logger.log('GET /cloud-api/regions');
    return this.regionService.findAll();
  }

  // Returns cloud providers available in a specific region
  @Get(':id/cloud-providers')
  @ApiGetRegionProviders()
  getCloudProviders(@Param('id') id: string): Promise<ProviderOptionDto[]> {
    this.logger.log(`GET /cloud-api/regions/${id}/cloud-providers`);
    return this.regionService.getCloudProviders(id);
  }
}
