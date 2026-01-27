import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Logger, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  private readonly logger = new Logger(TenantController.name);

  constructor(private readonly tenantService: TenantService) {}

  /**
   * Create a new tenant
   * POST /tenants
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiBody({ type: CreateTenantDto, description: 'Tenant creation data' })
  @ApiResponse({
    status: 201,
    description: 'Tenant successfully created',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 409, description: 'Conflict - Tenant with subdomain already exists' })
  async create(@Body() createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    this.logger.log(`POST /tenants - Creating tenant: ${createTenantDto.subdomain}`);
    return await this.tenantService.create(createTenantDto);
  }

  /**
   * Get all tenants
   * GET /tenants
   */
  @Get()
  @ApiOperation({ summary: 'Retrieve all tenants' })
  @ApiResponse({
    status: 200,
    description: 'List of all tenants retrieved successfully',
    type: [TenantResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  async findAll(): Promise<TenantResponseDto[]> {
    this.logger.log('GET /tenants - Fetching all tenants');
    return await this.tenantService.findAll();
  }

  /**
   * Get tenant by ID
   * GET /tenants/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a tenant by ID' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the tenant',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findById(@Param('id') id: string): Promise<TenantResponseDto> {
    this.logger.log(`GET /tenants/${id} - Fetching tenant by ID`);
    return await this.tenantService.findById(id);
  }

  /**
   * Get tenant by subdomain
   * GET /tenants/subdomain/:subdomain
   */
  @Get('subdomain/:subdomain')
  @ApiOperation({ summary: 'Retrieve a tenant by subdomain' })
  @ApiParam({
    name: 'subdomain',
    description: 'Unique subdomain identifier of the tenant',
    example: 'acme-corp',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant retrieved successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async findBySubdomain(@Param('subdomain') subdomain: string): Promise<TenantResponseDto> {
    this.logger.log(`GET /tenants/subdomain/${subdomain} - Fetching tenant by subdomain`);
    return await this.tenantService.findBySubdomain(subdomain);
  }

  /**
   * Update tenant
   * PATCH /tenants/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a tenant' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the tenant to update',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateTenantDto, description: 'Tenant update data' })
  @ApiResponse({
    status: 200,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Subdomain already in use by another tenant' })
  async update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto): Promise<TenantResponseDto> {
    this.logger.log(`PATCH /tenants/${id} - Updating tenant`);
    return await this.tenantService.update(id, updateTenantDto);
  }

  /**
   * Archive tenant (soft delete)
   * DELETE /tenants/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a tenant (soft delete)' })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the tenant to archive',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant archived successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid or missing authentication' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async archive(@Param('id') id: string): Promise<TenantResponseDto> {
    this.logger.log(`DELETE /tenants/${id} - Archiving tenant`);
    return await this.tenantService.archive(id);
  }
}
