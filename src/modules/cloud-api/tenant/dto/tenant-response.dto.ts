import type { DatabaseType, Tenant, TenantDatabaseConfig, TenantStatus } from '@/db/schema';
import { TenantDatabaseConfigResponseDto } from './tenant-database-config-response.dto';

/** Tenant with optional database configuration relation */
type TenantWithConfig = Tenant & {
  databaseConfig?: TenantDatabaseConfig | null;
};

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
   * Create from Tenant model with optional database configuration
   * @param tenant - Tenant model with optional databaseConfig relation
   * @returns TenantResponseDto with sanitized database configuration
   */
  static from(tenant: TenantWithConfig): TenantResponseDto {
    return new TenantResponseDto({
      id: tenant.id,
      subdomain: tenant.subdomain,
      name: tenant.name,
      description: tenant.description,
      dbType: tenant.dbType,
      status: tenant.status,
      databaseConfig: tenant.databaseConfig ? TenantDatabaseConfigResponseDto.from(tenant.databaseConfig) : null,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    });
  }
}
