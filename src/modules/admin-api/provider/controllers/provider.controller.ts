import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiCreateProvider,
  ApiDeleteProvider,
  ApiFindAllProviders,
  ApiFindProviderById,
  ApiUpdateProvider,
} from '../docs/provider.docs';
import { ProviderDto } from '../dto/entity/provider.dto';
import { CreateProviderDto } from '../dto/request/create-provider.dto';
import { UpdateProviderDto } from '../dto/request/update-provider.dto';
import { ProviderService } from '../services/provider.service';

@ApiTags('Admin - Providers')
@ApiBearerAuth()
@Controller('providers')
export class ProviderController {
  private readonly logger = new Logger(ProviderController.name);

  constructor(private readonly providerService: ProviderService) {}

  // Creates a new provider
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateProvider()
  create(@Body() dto: CreateProviderDto): Promise<ProviderDto> {
    this.logger.log('POST /admin-api/providers');
    return this.providerService.create(dto);
  }

  // Returns all providers
  @Get()
  @ApiFindAllProviders()
  findAll(): Promise<ProviderDto[]> {
    this.logger.log('GET /admin-api/providers');
    return this.providerService.findAll();
  }

  // Returns a single provider by ID
  @Get(':id')
  @ApiFindProviderById()
  findById(@Param('id') id: string): Promise<ProviderDto> {
    this.logger.log(`GET /admin-api/providers/${id}`);
    return this.providerService.findById(id);
  }

  // Updates a provider by ID
  @Patch(':id')
  @ApiUpdateProvider()
  update(@Param('id') id: string, @Body() dto: UpdateProviderDto): Promise<ProviderDto> {
    this.logger.log(`PATCH /admin-api/providers/${id}`);
    return this.providerService.update(id, dto);
  }

  // Deletes a provider by ID
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiDeleteProvider()
  delete(@Param('id') id: string): Promise<ProviderDto> {
    this.logger.log(`DELETE /admin-api/providers/${id}`);
    return this.providerService.delete(id);
  }
}
