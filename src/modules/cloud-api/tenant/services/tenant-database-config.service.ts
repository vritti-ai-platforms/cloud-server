import { Injectable, Logger } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@vritti/api-sdk';
import { eq } from '@vritti/api-sdk/drizzle-orm';
import { tenantDatabaseConfigs } from '@/db/schema';
import type { CreateTenantDatabaseConfigDto } from '../dto/request/create-tenant-database-config.dto';
import { TenantDatabaseConfigResponseDto } from '../dto/entity/tenant-database-config-response.dto';
import type { UpdateTenantDatabaseConfigDto } from '../dto/request/update-tenant-database-config.dto';
import { TenantDatabaseConfigRepository } from '../repositories/tenant-database-config.repository';

@Injectable()
export class TenantDatabaseConfigService {
  private readonly logger = new Logger(TenantDatabaseConfigService.name);

  constructor(private readonly configRepository: TenantDatabaseConfigRepository) {}

  // Creates a database configuration for a tenant; throws if one already exists
  async create(tenantId: string, dto: CreateTenantDatabaseConfigDto): Promise<TenantDatabaseConfigResponseDto> {
    this.logger.log(`Creating database config for tenant: ${tenantId}`);

    // Check if config already exists
    const existing = await this.configRepository.findByTenantId(tenantId);
    if (existing) {
      throw new BadRequestException({
        label: 'Database Configuration Exists',
        detail: 'A database configuration already exists for this organization. Please update the existing configuration instead.',
      });
    }

    // Validate configuration
    this.validateDatabaseConfig(dto);

    // Create configuration
    // TODO: Encrypt dbPassword before storing
    const config = await this.configRepository.create({
      tenantId,
      dbHost: dto.dbHost,
      dbPort: dto.dbPort,
      dbUsername: dto.dbUsername,
      dbPassword: dto.dbPassword,
      dbName: dto.dbName,
      dbSchema: dto.dbSchema,
      dbSslMode: dto.dbSslMode,
      connectionPoolSize: dto.connectionPoolSize,
    });

    this.logger.log(`Database config created for tenant: ${tenantId}`);
    return TenantDatabaseConfigResponseDto.from(config);
  }

  // Retrieves the database configuration for a tenant; throws if not found
  async getByTenantId(tenantId: string): Promise<TenantDatabaseConfigResponseDto> {
    const config = await this.configRepository.findByTenantId(tenantId);
    if (!config) {
      throw new NotFoundException({
        label: 'Database Configuration Not Found',
        detail: 'No database configuration exists for this organization. Please create one first.',
      });
    }

    return TenantDatabaseConfigResponseDto.from(config);
  }

  // Updates the database configuration for a tenant; throws if not found
  async update(tenantId: string, dto: UpdateTenantDatabaseConfigDto): Promise<TenantDatabaseConfigResponseDto> {
    this.logger.log(`Updating database config for tenant: ${tenantId}`);

    // Check if config exists
    const existing = await this.configRepository.findByTenantId(tenantId);
    if (!existing) {
      throw new NotFoundException({
        label: 'Database Configuration Not Found',
        detail: 'No database configuration exists for this organization. Please create one first.',
      });
    }

    // Validate updated configuration
    if (Object.keys(dto).length > 0) {
      // Convert null to undefined for validation (Prisma returns null, DTO expects undefined)
      const existingForValidation = {
        ...existing,
        dbSchema: existing.dbSchema ?? undefined,
      };
      this.validateDatabaseConfig({ ...existingForValidation, ...dto });
    }

    // TODO: Encrypt dbPassword if provided in update
    const config = await this.configRepository.updateByTenantId(tenantId, dto);

    this.logger.log(`Database config updated for tenant: ${tenantId}`);
    return TenantDatabaseConfigResponseDto.from(config);
  }

  // Deletes the database configuration for a tenant; throws if not found
  async delete(tenantId: string): Promise<void> {
    this.logger.log(`Deleting database config for tenant: ${tenantId}`);

    // Check if config exists
    const existing = await this.configRepository.findByTenantId(tenantId);
    if (!existing) {
      throw new NotFoundException({
        label: 'Database Configuration Not Found',
        detail: 'No database configuration exists for this organization. There is nothing to delete.',
      });
    }

    await this.configRepository.deleteByTenantId(tenantId);
    this.logger.log(`Database config deleted for tenant: ${tenantId}`);
  }

  // Checks whether a database configuration exists for the given tenant
  async exists(tenantId: string): Promise<boolean> {
    return this.configRepository.exists(eq(tenantDatabaseConfigs.tenantId, tenantId));
  }

  // Validates host, port, and connection pool size constraints
  private validateDatabaseConfig(dto: Partial<CreateTenantDatabaseConfigDto>): void {
    // Validate host
    if (dto.dbHost && !this.isValidHost(dto.dbHost)) {
      throw new BadRequestException({
        label: 'Invalid Database Host',
        detail: 'The database host format is invalid. Please provide a valid hostname, IP address, or localhost.',
        errors: [
          {
            field: 'dbHost',
            message: 'Invalid database host format',
          },
        ],
      });
    }

    // Validate port
    if (dto.dbPort && (dto.dbPort < 1 || dto.dbPort > 65535)) {
      throw new BadRequestException({
        label: 'Invalid Database Port',
        detail: 'The database port must be a valid port number between 1 and 65535.',
        errors: [
          {
            field: 'dbPort',
            message: 'Database port must be between 1 and 65535',
          },
        ],
      });
    }

    // Validate connection pool size
    if (dto.connectionPoolSize && (dto.connectionPoolSize < 1 || dto.connectionPoolSize > 100)) {
      throw new BadRequestException({
        label: 'Invalid Connection Pool Size',
        detail: 'The connection pool size must be between 1 and 100 connections.',
        errors: [
          {
            field: 'connectionPoolSize',
            message: 'Connection pool size must be between 1 and 100',
          },
        ],
      });
    }

    // TODO: Add connection testing logic here
    // - Test if database is reachable
    // - Test if credentials are valid
    // - Test if database/schema exists
  }

  // Checks whether a hostname is a valid domain, IP address, or localhost
  private isValidHost(host: string): boolean {
    // Basic hostname validation (allows localhost, IP addresses, domain names)
    const hostPattern = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    return hostPattern.test(host) || ipPattern.test(host) || host === 'localhost';
  }
}
