import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DatabaseType, Tenant, TenantDatabaseConfig, TenantStatus } from '@/db/schema';
import { TenantDatabaseConfigResponseDto } from './tenant-database-config-response.dto';

/** Tenant with optional database configuration relation */
type TenantWithConfig = Tenant & {
  databaseConfig?: TenantDatabaseConfig | null;
};

export class TenantResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the tenant',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Unique subdomain identifier for the tenant. Used in URLs and routing.',
    example: 'acme-corp',
  })
  subdomain: string;

  @ApiProperty({
    description: 'Display name of the tenant organization',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the tenant organization',
    example: 'Leading provider of innovative solutions',
    nullable: true,
  })
  description?: string | null;

  @ApiProperty({
    description: 'Database deployment type for the tenant',
    enum: ['SHARED', 'DEDICATED'],
    example: 'SHARED',
  })
  dbType: DatabaseType;

  @ApiProperty({
    description: 'Current operational status of the tenant',
    enum: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'],
    example: 'ACTIVE',
  })
  status: TenantStatus;

  // Database configuration (if exists, for DEDICATED tenants)
  @ApiPropertyOptional({
    description: 'Database configuration details (only present for DEDICATED tenants)',
    type: () => TenantDatabaseConfigResponseDto,
    nullable: true,
  })
  databaseConfig?: TenantDatabaseConfigResponseDto | null;

  // Metadata
  @ApiProperty({
    description: 'Timestamp when the tenant was created',
    example: '2024-01-15T10:30:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the tenant was last updated',
    example: '2024-01-20T14:45:00.000Z',
    type: 'string',
    format: 'date-time',
  })
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
