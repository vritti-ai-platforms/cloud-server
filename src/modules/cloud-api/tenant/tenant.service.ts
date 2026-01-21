import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, ConflictException, NotFoundException } from '@vritti/api-sdk';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantResponseDto } from './dto/tenant-response.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantRepository } from './tenant.repository';
import { TenantDatabaseConfigService } from './tenant-database-config.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly configService: TenantDatabaseConfigService,
  ) {}

  /**
   * Create a new tenant
   */
  async create(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    // Validate database configuration based on dbType
    this.validateDatabaseConfig(createTenantDto);

    // Create tenant (business data only)
    // Subdomain uniqueness is enforced by database constraint - no pre-check needed
    // This approach is race-condition safe and more performant (1 query instead of 2)
    let tenant;
    try {
      tenant = await this.tenantRepository.create(createTenantDto);
    } catch (error) {
      this.handleUniqueConstraintError(error, 'subdomain', createTenantDto.subdomain);
      throw error;
    }

    // Create database configuration if DEDICATED type
    if (createTenantDto.dbType === 'DEDICATED') {
      const dbConfig = this.assertDedicatedDbConfig(createTenantDto);
      await this.configService.create(tenant.id, {
        ...dbConfig,
        dbSchema: createTenantDto.dbSchema,
        dbSslMode: createTenantDto.dbSslMode,
        connectionPoolSize: createTenantDto.connectionPoolSize,
      });
    }

    this.logger.log(`Created tenant: ${tenant.subdomain} (${tenant.id})`);

    // Return tenant with config (if exists)
    return this.findById(tenant.id);
  }

  /**
   * Get all tenants
   */
  async findAll(): Promise<TenantResponseDto[]> {
    const tenants = await this.tenantRepository.findAll();
    return tenants.map((tenant) => TenantResponseDto.from(tenant));
  }

  /**
   * Get tenant by ID
   */
  async findById(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findByIdWithConfig(id);

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with ID '${id}' not found`,
        "We couldn't find the organization you're looking for. Please check the ID and try again.",
      );
    }

    return TenantResponseDto.from(tenant);
  }

  /**
   * Get tenant by subdomain
   */
  async findBySubdomain(subdomain: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findBySubdomain(subdomain, true); // Include config

    if (!tenant) {
      throw new NotFoundException(
        `Tenant with subdomain '${subdomain}' not found`,
        "We couldn't find an organization with this subdomain. Please check the subdomain and try again.",
      );
    }

    return TenantResponseDto.from(tenant);
  }

  /**
   * Update tenant
   */
  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantResponseDto> {
    // Check if tenant exists and get current data including config
    // This single query provides both existence check AND config existence check,
    // avoiding a separate configService.exists() call later
    const existing = await this.tenantRepository.findByIdWithConfig(id);
    if (!existing) {
      throw new NotFoundException(
        `Tenant with ID '${id}' not found`,
        "We couldn't find the organization you're trying to update. Please check the ID and try again.",
      );
    }

    // Extract database config fields from update DTO
    const { dbHost, dbPort, dbUsername, dbPassword, dbName, dbSchema, dbSslMode, connectionPoolSize, ...tenantData } =
      updateTenantDto;

    // Update tenant (business data only)
    // Subdomain uniqueness is enforced by database constraint - no pre-check needed
    // This approach is race-condition safe and more performant
    let tenant;
    try {
      tenant = await this.tenantRepository.update(id, tenantData);
    } catch (error) {
      if (updateTenantDto.subdomain) {
        this.handleUniqueConstraintError(error, 'subdomain', updateTenantDto.subdomain);
      }
      throw error;
    }

    // Update database configuration if any DB fields are provided
    const hasDbConfigFields =
      dbHost || dbPort || dbUsername || dbPassword || dbName || dbSchema || dbSslMode || connectionPoolSize;

    if (hasDbConfigFields) {
      // Reuse databaseConfig from initial findByIdWithConfig query to check if config exists
      // This eliminates a separate configService.exists() database call
      const configExists = !!(existing as { databaseConfig?: unknown }).databaseConfig;

      if (configExists) {
        // Update existing config
        await this.configService.update(id, {
          dbHost,
          dbPort,
          dbUsername,
          dbPassword,
          dbName,
          dbSchema,
          dbSslMode,
          connectionPoolSize,
        });
      } else if (tenant.dbType === 'DEDICATED') {
        // Create new config if tenant is DEDICATED and config doesn't exist
        const dbConfig = this.assertDedicatedDbConfig({ dbHost, dbPort, dbUsername, dbPassword, dbName });
        await this.configService.create(id, {
          ...dbConfig,
          dbSchema,
          dbSslMode,
          connectionPoolSize,
        });
      }
    }

    this.logger.log(`Updated tenant: ${tenant.subdomain} (${tenant.id})`);

    // Fetch updated tenant with config for response
    // Call findByIdWithConfig directly instead of going through findById method
    // to get fresh data after updates (needed because tenant and config may have changed)
    const updatedTenant = await this.tenantRepository.findByIdWithConfig(id);

    // This should never happen since we just updated the tenant, but handle defensively
    if (!updatedTenant) {
      throw new NotFoundException(
        `Tenant with ID '${id}' not found after update`,
        'An unexpected error occurred while retrieving the updated organization.',
      );
    }

    return TenantResponseDto.from(updatedTenant);
  }

  /**
   * Archive tenant (soft delete)
   *
   * Uses single DELETE query with RETURNING clause to both delete and retrieve the record.
   * If no record exists, delete() returns undefined, which we handle by throwing NotFoundException.
   * This eliminates the redundant SELECT query that was previously used for existence checking.
   */
  async archive(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.delete(id);

    // If no tenant was deleted (record didn't exist), throw NotFoundException
    if (!tenant) {
      throw new NotFoundException(
        `Tenant with ID '${id}' not found`,
        "We couldn't find the organization you're trying to archive. Please check the ID and try again.",
      );
    }

    this.logger.log(`Archived tenant: ${tenant.subdomain} (${tenant.id})`);

    return TenantResponseDto.from(tenant);
  }

  /**
   * Assert that all required DEDICATED database config fields are present
   */
  private assertDedicatedDbConfig(dto: Partial<Pick<CreateTenantDto, 'dbHost' | 'dbPort' | 'dbUsername' | 'dbPassword' | 'dbName'>>): {
    dbHost: string;
    dbPort: number;
    dbUsername: string;
    dbPassword: string;
    dbName: string;
  } {
    if (!dto.dbHost || !dto.dbPort || !dto.dbUsername || !dto.dbPassword || !dto.dbName) {
      throw new BadRequestException(
        'dbHost',
        'Complete database configuration is required for DEDICATED type',
        'Please provide all database connection details.',
      );
    }
    return {
      dbHost: dto.dbHost,
      dbPort: dto.dbPort,
      dbUsername: dto.dbUsername,
      dbPassword: dto.dbPassword,
      dbName: dto.dbName,
    };
  }

  /**
   * Validate database configuration based on tenant type
   */
  private validateDatabaseConfig(dto: CreateTenantDto): void {
    if (dto.dbType === 'SHARED') {
      // For SHARED, dbSchema is required
      if (!dto.dbSchema) {
        throw new BadRequestException(
          'dbSchema',
          'dbSchema is required when database type is SHARED',
          'A database schema is required for shared database configuration. Please provide a schema name.',
        );
      }
    } else if (dto.dbType === 'DEDICATED') {
      // For DEDICATED, full database connection details are required
      if (!dto.dbHost || !dto.dbName || !dto.dbUsername || !dto.dbPassword) {
        throw new BadRequestException(
          'dbHost',
          'dbHost, dbName, dbUsername, and dbPassword are required for DEDICATED database type',
          'Complete database connection details are required for dedicated database configuration. Please provide host, name, username, and password.',
        );
      }
    }
  }

  /**
   * Handle PostgreSQL unique constraint violation errors
   * Converts database-level constraint errors to user-friendly ConflictException
   *
   * @param error - The error thrown by the database operation
   * @param field - The field that has the unique constraint
   * @param value - The value that caused the conflict
   * @throws ConflictException if the error is a unique constraint violation
   */
  private handleUniqueConstraintError(error: unknown, field: string, value: string): void {
    // PostgreSQL unique constraint violation error code is 23505
    if (
      error instanceof Error &&
      'code' in error &&
      (error as Error & { code: string }).code === '23505'
    ) {
      throw new ConflictException(
        field,
        `Tenant with ${field} '${value}' already exists`,
        `This ${field} is already taken. Please choose a different ${field} for your organization.`,
      );
    }
  }
}
