import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SelectOptionsQueryDto, SuccessResponseDto, UserId, type SelectQueryResult } from '@vritti/api-sdk';
import {
  ApiAddRegionCloudProvider,
  ApiCreateRegion,
  ApiDeleteRegion,
  ApiFindForTableRegions,
  ApiFindRegionById,
  ApiFindRegionsSelect,
  ApiRemoveRegionCloudProvider,
  ApiUpdateRegion,
} from '../docs/region.docs';
import { RegionDto } from '../dto/entity/region.dto';
import { CreateRegionDto } from '../dto/request/create-region.dto';
import { UpdateRegionDto } from '../dto/request/update-region.dto';
import { RegionTableResponseDto } from '../dto/response/regions-response.dto';
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
  create(@Body() dto: CreateRegionDto): Promise<SuccessResponseDto> {
    this.logger.log('POST /admin-api/regions');
    return this.regionService.create(dto);
  }

  // Returns regions for the data table with server-stored filter/sort/search/pagination state
  @Get('table')
  @ApiFindForTableRegions()
  findForTable(@UserId() userId: string): Promise<RegionTableResponseDto> {
    this.logger.log('GET /admin-api/regions/table');
    return this.regionService.findForTable(userId);
  }

  // Returns paginated region options for the select component
  @Get('select')
  @ApiFindRegionsSelect()
  findForSelect(@Query() query: SelectOptionsQueryDto): Promise<SelectQueryResult> {
    this.logger.log('GET /admin-api/regions/select');
    return this.regionService.findForSelect(query);
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
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto): Promise<SuccessResponseDto> {
    this.logger.log(`PATCH /admin-api/regions/${id}`);
    return this.regionService.update(id, dto);
  }

  // Deletes a region by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteRegion()
  delete(@Param('id') id: string): Promise<SuccessResponseDto> {
    this.logger.log(`DELETE /admin-api/regions/${id}`);
    return this.regionService.delete(id);
  }

  // Assigns a single cloud provider to a region
  @Post(':id/cloud-providers/:providerId')
  @HttpCode(HttpStatus.CREATED)
  @ApiAddRegionCloudProvider()
  addCloudProvider(@Param('id') id: string, @Param('providerId') providerId: string): Promise<void> {
    this.logger.log(`POST /admin-api/regions/${id}/cloud-providers/${providerId}`);
    return this.regionService.addCloudProvider(id, providerId);
  }

  // Removes a single cloud provider assignment from a region
  @Delete(':id/cloud-providers/:providerId')
  @HttpCode(HttpStatus.OK)
  @ApiRemoveRegionCloudProvider()
  removeCloudProvider(@Param('id') id: string, @Param('providerId') providerId: string): Promise<void> {
    this.logger.log(`DELETE /admin-api/regions/${id}/cloud-providers/${providerId}`);
    return this.regionService.removeCloudProvider(id, providerId);
  }
}
