import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserId } from '@vritti/api-sdk';
import {
  ApiCreateCloudProvider,
  ApiDeleteCloudProvider,
  ApiFindAllCloudProviders,
  ApiFindCloudProviderById,
  ApiUpdateCloudProvider,
} from '../docs/cloud-provider.docs';
import { CloudProviderDto } from '../dto/entity/cloud-provider.dto';
import { CloudProvidersResponseDto } from '../dto/response/cloud-providers-response.dto';
import { CreateCloudProviderDto } from '../dto/request/create-cloud-provider.dto';
import { UpdateCloudProviderDto } from '../dto/request/update-cloud-provider.dto';
import { CloudProviderService } from '../services/cloud-provider.service';

@ApiTags('Admin - Cloud Providers')
@ApiBearerAuth()
@Controller('cloud-providers')
export class CloudProviderController {
  private readonly logger = new Logger(CloudProviderController.name);

  constructor(private readonly cloudProviderService: CloudProviderService) {}

  // Creates a new cloud provider
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateCloudProvider()
  create(@Body() dto: CreateCloudProviderDto): Promise<CloudProviderDto> {
    this.logger.log('POST /admin-api/cloud-providers');
    return this.cloudProviderService.create(dto);
  }

  // Returns all cloud providers with server-stored filter/sort state applied, optionally narrowed by a search param
  @Get()
  @ApiFindAllCloudProviders()
  findAll(
    @UserId() userId: string,
    @Query('searchColumn') searchColumn?: string,
    @Query('searchValue') searchValue?: string,
  ): Promise<CloudProvidersResponseDto> {
    this.logger.log('GET /admin-api/cloud-providers');
    return this.cloudProviderService.findAll(userId, searchColumn, searchValue);
  }

  // Returns a single cloud provider by ID
  @Get(':id')
  @ApiFindCloudProviderById()
  findById(@Param('id') id: string): Promise<CloudProviderDto> {
    this.logger.log(`GET /admin-api/cloud-providers/${id}`);
    return this.cloudProviderService.findById(id);
  }

  // Updates a cloud provider by ID
  @Patch(':id')
  @ApiUpdateCloudProvider()
  update(@Param('id') id: string, @Body() dto: UpdateCloudProviderDto): Promise<CloudProviderDto> {
    this.logger.log(`PATCH /admin-api/cloud-providers/${id}`);
    return this.cloudProviderService.update(id, dto);
  }

  // Deletes a cloud provider by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteCloudProvider()
  delete(@Param('id') id: string): Promise<CloudProviderDto> {
    this.logger.log(`DELETE /admin-api/cloud-providers/${id}`);
    return this.cloudProviderService.delete(id);
  }
}
