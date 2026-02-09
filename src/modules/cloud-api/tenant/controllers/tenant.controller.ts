import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ApiArchiveTenant,
  ApiCreateTenant,
  ApiFindAllTenants,
  ApiFindTenantById,
  ApiFindTenantBySubdomain,
  ApiUpdateTenant,
} from '../docs/tenant.docs';
import { CreateTenantDto } from '../dto/request/create-tenant.dto';
import { TenantResponseDto } from '../dto/entity/tenant-response.dto';
import { UpdateTenantDto } from '../dto/request/update-tenant.dto';
import { TenantService } from '../services/tenant.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  private readonly logger = new Logger(TenantController.name);

  constructor(private readonly tenantService: TenantService) {}

  // Creates a new tenant with database configuration
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateTenant()
  async create(@Body() createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    this.logger.log(`POST /tenants - Creating tenant: ${createTenantDto.subdomain}`);
    return await this.tenantService.create(createTenantDto);
  }

  // Retrieves all tenants in the system
  @Get()
  @ApiFindAllTenants()
  async findAll(): Promise<TenantResponseDto[]> {
    this.logger.log('GET /tenants - Fetching all tenants');
    return await this.tenantService.findAll();
  }

  // Retrieves a single tenant by their unique identifier
  @Get(':id')
  @ApiFindTenantById()
  async findById(@Param('id') id: string): Promise<TenantResponseDto> {
    this.logger.log(`GET /tenants/${id} - Fetching tenant by ID`);
    return await this.tenantService.findById(id);
  }

  // Retrieves a tenant by their subdomain
  @Get('subdomain/:subdomain')
  @ApiFindTenantBySubdomain()
  async findBySubdomain(@Param('subdomain') subdomain: string): Promise<TenantResponseDto> {
    this.logger.log(`GET /tenants/subdomain/${subdomain} - Fetching tenant by subdomain`);
    return await this.tenantService.findBySubdomain(subdomain);
  }

  // Updates tenant details and database configuration
  @Patch(':id')
  @ApiUpdateTenant()
  async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto): Promise<TenantResponseDto> {
    this.logger.log(`PATCH /tenants/${id} - Updating tenant`);
    return await this.tenantService.update(id, updateTenantDto);
  }

  // Soft deletes a tenant by marking them as archived
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiArchiveTenant()
  async archive(@Param('id') id: string): Promise<TenantResponseDto> {
    this.logger.log(`DELETE /tenants/${id} - Archiving tenant`);
    return await this.tenantService.archive(id);
  }
}
