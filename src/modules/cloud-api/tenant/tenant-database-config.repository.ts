import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient, TenantDatabaseConfig } from '@prisma/client';
import { PrimaryDatabaseService } from '@vritti/api-sdk';
import { CreateTenantDatabaseConfigDto } from './dto/create-tenant-database-config.dto';
import { UpdateTenantDatabaseConfigDto } from './dto/update-tenant-database-config.dto';

/**
 * Repository for managing tenant database configuration data access
 * Handles CRUD operations for tenant database connection details
 */
@Injectable()
export class TenantDatabaseConfigRepository {
  private readonly logger = new Logger(TenantDatabaseConfigRepository.name);

  constructor(private readonly primaryDb: PrimaryDatabaseService) {}

  /**
   * Get Prisma client for tenant registry database
   */
  private async getPrisma(): Promise<PrismaClient> {
    return await this.primaryDb.getPrimaryDbClient<PrismaClient>();
  }

  /**
   * Creates a new tenant database configuration
   * @param tenantId - ID of the tenant
   * @param data - Database configuration data
   * @returns Created configuration
   */
  async create(
    tenantId: string,
    data: CreateTenantDatabaseConfigDto,
  ): Promise<TenantDatabaseConfig> {
    const prisma = await this.getPrisma();
    this.logger.log(`Creating database config for tenant: ${tenantId}`);

    return await prisma.tenantDatabaseConfig.create({
      data: {
        tenantId,
        dbHost: data.dbHost,
        dbPort: data.dbPort,
        dbUsername: data.dbUsername,
        dbPassword: data.dbPassword,
        dbName: data.dbName,
        dbSchema: data.dbSchema,
        dbSslMode: data.dbSslMode,
        connectionPoolSize: data.connectionPoolSize,
      },
    });
  }

  /**
   * Finds a tenant database configuration by tenant ID
   * @param tenantId - ID of the tenant
   * @returns Configuration if found, null otherwise
   */
  async findByTenantId(
    tenantId: string,
  ): Promise<TenantDatabaseConfig | null> {
    const prisma = await this.getPrisma();
    this.logger.debug(`Finding database config for tenant: ${tenantId}`);

    return await prisma.tenantDatabaseConfig.findUnique({
      where: { tenantId },
    });
  }

  /**
   * Updates a tenant database configuration
   * @param tenantId - ID of the tenant
   * @param data - Partial database configuration data
   * @returns Updated configuration
   */
  async update(
    tenantId: string,
    data: UpdateTenantDatabaseConfigDto,
  ): Promise<TenantDatabaseConfig> {
    const prisma = await this.getPrisma();
    this.logger.log(`Updating database config for tenant: ${tenantId}`);

    return await prisma.tenantDatabaseConfig.update({
      where: { tenantId },
      data: {
        dbHost: data.dbHost,
        dbPort: data.dbPort,
        dbUsername: data.dbUsername,
        dbPassword: data.dbPassword,
        dbName: data.dbName,
        dbSchema: data.dbSchema,
        dbSslMode: data.dbSslMode,
        connectionPoolSize: data.connectionPoolSize,
      },
    });
  }

  /**
   * Deletes a tenant database configuration
   * @param tenantId - ID of the tenant
   * @returns Deleted configuration
   */
  async delete(tenantId: string): Promise<TenantDatabaseConfig> {
    const prisma = await this.getPrisma();
    this.logger.log(`Deleting database config for tenant: ${tenantId}`);

    return await prisma.tenantDatabaseConfig.delete({
      where: { tenantId },
    });
  }

  /**
   * Checks if a tenant has a database configuration
   * @param tenantId - ID of the tenant
   * @returns True if config exists, false otherwise
   */
  async exists(tenantId: string): Promise<boolean> {
    const prisma = await this.getPrisma();

    const count = await prisma.tenantDatabaseConfig.count({
      where: { tenantId },
    });
    return count > 0;
  }
}
