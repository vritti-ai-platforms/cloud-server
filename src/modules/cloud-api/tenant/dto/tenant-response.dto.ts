import { DatabaseType, TenantStatus } from '@prisma/client';
import { TenantDatabaseConfigResponseDto } from './tenant-database-config-response.dto';

export class TenantResponseDto {
  id: string;
  subdomain: string;
  name: string;
  description?: string | null;
  dbType: DatabaseType;
  status: TenantStatus;

  // Database configuration (if exists, for DEDICATED tenants)
  databaseConfig?: TenantDatabaseConfigResponseDto | null;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<TenantResponseDto>) {
    Object.assign(this, partial);
  }

  /**
   * Create from Prisma Tenant model with optional database configuration
   * @param tenant - Tenant model with optional databaseConfig relation
   * @returns TenantResponseDto with sanitized database configuration
   */
  static fromPrisma(tenant: any): TenantResponseDto {
    return new TenantResponseDto({
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      description: tenant.description,
      dbType: tenant.dbType,
      status: tenant.status,
      databaseConfig: tenant.databaseConfig
        ? TenantDatabaseConfigResponseDto.fromPrisma(tenant.databaseConfig)
        : null,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });
  }
}
