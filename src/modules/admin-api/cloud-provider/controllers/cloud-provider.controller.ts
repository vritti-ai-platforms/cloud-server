import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SelectOptionsQueryDto, SuccessResponseDto, UserId, type SelectQueryResult } from '@vritti/api-sdk';
import {
  ApiCreateCloudProvider,
  ApiDeleteCloudProvider,
  ApiFindAllCloudProviders,
  ApiFindCloudProviderById,
  ApiFindCloudProvidersSelect,
  ApiUpdateCloudProvider,
} from '../docs/cloud-provider.docs';
import { CloudProviderDto } from '../dto/entity/cloud-provider.dto';
import { CreateCloudProviderDto } from '../dto/request/create-cloud-provider.dto';
import { UpdateCloudProviderDto } from '../dto/request/update-cloud-provider.dto';
import { CloudProvidersResponseDto } from '../dto/response/cloud-providers-response.dto';
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
  create(@Body() dto: CreateCloudProviderDto): Promise<SuccessResponseDto> {
    this.logger.log('POST /admin-api/cloud-providers');
    return this.cloudProviderService.create(dto);
  }

  // Returns paginated cloud provider options for the select component
  @Get('select')
  @ApiFindCloudProvidersSelect()
  findForSelect(@Query() query: SelectOptionsQueryDto): Promise<SelectQueryResult> {
    this.logger.log('GET /admin-api/cloud-providers/select');
    return this.cloudProviderService.findForSelect(query);
  }

  // Returns all cloud providers with server-stored filter/sort/search state applied
  @Get()
  @ApiFindAllCloudProviders()
  findAll(@UserId() userId: string): Promise<CloudProvidersResponseDto> {
    this.logger.log('GET /admin-api/cloud-providers');
    return this.cloudProviderService.findAll(userId);
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
  update(@Param('id') id: string, @Body() dto: UpdateCloudProviderDto): Promise<SuccessResponseDto> {
    this.logger.log(`PATCH /admin-api/cloud-providers/${id}`);
    return this.cloudProviderService.update(id, dto);
  }

  // Deletes a cloud provider by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteCloudProvider()
  delete(@Param('id') id: string): Promise<SuccessResponseDto> {
    this.logger.log(`DELETE /admin-api/cloud-providers/${id}`);
    return this.cloudProviderService.delete(id);
  }
}
