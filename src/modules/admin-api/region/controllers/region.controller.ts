import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiCreateRegion,
  ApiDeleteRegion,
  ApiFindAllRegions,
  ApiFindRegionById,
  ApiUpdateRegion,
} from '../docs/region.docs';
import { RegionDto } from '../dto/entity/region.dto';
import { CreateRegionDto } from '../dto/request/create-region.dto';
import { UpdateRegionDto } from '../dto/request/update-region.dto';
import { RegionService } from '../services/region.service';

@ApiTags('Admin - Regions')
@ApiBearerAuth()
@Controller('regions')
export class RegionController {
  private readonly logger = new Logger(RegionController.name);

  constructor(private readonly regionService: RegionService) {}

  // Creates a new region
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateRegion()
  create(@Body() dto: CreateRegionDto): Promise<RegionDto> {
    this.logger.log('POST /admin-api/regions');
    return this.regionService.create(dto);
  }

  // Returns all regions
  @Get()
  @ApiFindAllRegions()
  findAll(): Promise<RegionDto[]> {
    this.logger.log('GET /admin-api/regions');
    return this.regionService.findAll();
  }

  // Returns a single region by ID
  @Get(':id')
  @ApiFindRegionById()
  findById(@Param('id') id: string): Promise<RegionDto> {
    this.logger.log(`GET /admin-api/regions/${id}`);
    return this.regionService.findById(id);
  }

  // Updates a region by ID
  @Patch(':id')
  @ApiUpdateRegion()
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto): Promise<RegionDto> {
    this.logger.log(`PATCH /admin-api/regions/${id}`);
    return this.regionService.update(id, dto);
  }

  // Deletes a region by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteRegion()
  delete(@Param('id') id: string): Promise<RegionDto> {
    this.logger.log(`DELETE /admin-api/regions/${id}`);
    return this.regionService.delete(id);
  }
}
